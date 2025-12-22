/**
 * Tests for ChutesApi Credentials
 * Following TDD principles - tests are in /tests directory only
 */

import { ChutesApi } from '../../credentials/ChutesApi.credentials';

describe('ChutesApi Credentials', () => {
	let credentials: ChutesApi;

	beforeEach(() => {
		credentials = new ChutesApi();
	});

	describe('Basic Properties', () => {
		test('should have correct credential name', () => {
			expect(credentials.name).toBe('chutesApi');
		});

		test('should have correct display name', () => {
			expect(credentials.displayName).toBe('Chutes API');
		});

		test('should have documentation URL', () => {
			expect(credentials.documentationUrl).toBe('https://docs.chutes.ai/api');
		});
	});

	describe('Credential Properties', () => {
		test('should have API key property', () => {
			const apiKeyProperty = credentials.properties.find((prop) => prop.name === 'apiKey');

			expect(apiKeyProperty).toBeDefined();
			expect(apiKeyProperty?.displayName).toBe('API Key');
			expect(apiKeyProperty?.type).toBe('string');
			expect(apiKeyProperty?.required).toBe(true);
		});

		test('should have API key as password type', () => {
			const apiKeyProperty = credentials.properties.find((prop) => prop.name === 'apiKey');

			expect(apiKeyProperty?.typeOptions?.password).toBe(true);
		});

		test('should have environment selection property', () => {
			const envProperty = credentials.properties.find((prop) => prop.name === 'environment');

			expect(envProperty).toBeDefined();
			expect(envProperty?.type).toBe('options');
			expect(envProperty?.default).toBe('production');
		});

		test('should have production and sandbox environment options', () => {
			const envProperty = credentials.properties.find((prop) => prop.name === 'environment');
			const options = envProperty?.options as any[];

			expect(options).toContainEqual(
				expect.objectContaining({ name: 'Production', value: 'production' }),
			);
			expect(options).toContainEqual(
				expect.objectContaining({ name: 'Sandbox', value: 'sandbox' }),
			);
		});

		test('should have custom URL property', () => {
			const customUrlProperty = credentials.properties.find((prop) => prop.name === 'customUrl');

			expect(customUrlProperty).toBeDefined();
			expect(customUrlProperty?.type).toBe('string');
			expect(customUrlProperty?.required).toBe(false);
		});
	});

	describe('Authentication', () => {
		test('should use generic authentication type', () => {
			expect(credentials.authenticate?.type).toBe('generic');
		});

		test('should include Authorization header', () => {
			const headers = credentials.authenticate?.properties?.headers as any;

			expect(headers).toHaveProperty('Authorization');
			expect(headers.Authorization).toContain('Bearer');
		});

		test('should include custom client header', () => {
			const headers = credentials.authenticate?.properties?.headers as any;

			expect(headers).toHaveProperty('X-Chutes-Client', 'n8n-integration');
		});
	});

	describe('Credential Testing', () => {
		test('should have test configuration', () => {
			expect(credentials.test).toBeDefined();
			expect(credentials.test?.request).toBeDefined();
		});

	test('should test with /v1/models endpoint', () => {
		expect(credentials.test?.request?.url).toBe('/v1/models');
		expect(credentials.test?.request?.method).toBe('GET');
	});

		test('should use correct base URL for testing', () => {
			const baseURL = credentials.test?.request?.baseURL;

			expect(baseURL).toBeDefined();
			// Should dynamically select URL based on environment
			expect(baseURL).toContain('$credentials');
		});
	});
});

