/**
 * Tests for API Request Helper
 * Following TDD principles - all tests in /tests directory
 */

import { getChutesBaseUrl } from '../../../../nodes/Chutes/transport/apiRequest';
import { IDataObject } from 'n8n-workflow';

describe('API Request Helper', () => {
	describe('getChutesBaseUrl', () => {
		test('should return LLM chute URL by default (production)', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration');

			expect(result).toBe('https://llm.chutes.ai');
		});

		test('should return image chute URL for image generation', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'imageGeneration');

			expect(result).toBe('https://image.chutes.ai');
		});

		test('should return video chute URL for video generation', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'videoGeneration');

			expect(result).toBe('https://video.chutes.ai');
		});

		test('should return audio chute URL for audio generation', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'audioGeneration');

			expect(result).toBe('https://audio.chutes.ai');
		});

		test('should return sandbox URL when environment is sandbox', () => {
			const credentials: IDataObject = {
				environment: 'sandbox',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration');

			expect(result).toBe('https://sandbox-llm.chutes.ai');
		});

		test('should prioritize custom chute URL from parameter', () => {
			const credentials: IDataObject = {
				customUrl: 'https://credentials-custom.chutes.ai',
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration', 'https://param-custom.chutes.ai');

			expect(result).toBe('https://param-custom.chutes.ai');
		});

		test('should use credentials customUrl when no parameter customUrl provided', () => {
			const credentials: IDataObject = {
				customUrl: 'https://custom.api.chutes.ai',
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration');

			expect(result).toBe('https://custom.api.chutes.ai');
		});

		test('should prioritize customChuteUrl over credentials customUrl', () => {
			const credentials: IDataObject = {
				customUrl: 'https://credentials-url.com',
				environment: 'sandbox',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration', 'https://parameter-url.com');

			expect(result).toBe('https://parameter-url.com');
		});

		test('should handle inference resource type (uses LLM subdomain)', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'inference');

			expect(result).toBe('https://llm.chutes.ai');
		});

		test('should default to LLM chute when no resource type specified', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials);

			expect(result).toBe('https://llm.chutes.ai');
		});
	});

	// Note: Testing chutesApiRequest and chutesApiRequestWithRetry requires mocking
	// the IExecuteFunctions context, which is covered in integration tests
});

