/**
 * Tests for Load Options Methods
 * Following TDD principles - all tests in /tests directory
 */

import * as loadOptions from '../../../../nodes/Chutes/methods/loadOptions';
import { createMockLoadOptionsFunctions } from '../../../helpers/mocks';
import { mockTextModelsResponse, mockImageModelsResponse } from '../../../helpers/fixtures';

describe('Load Options Methods', () => {
	describe('getChutesTextModels', () => {
		test('uses credential-aware authenticated helper first', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextModelsResponse,
			);

			await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		test('should load text models from API', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextModelsResponse,
			);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		test('should format model options with name and value', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextModelsResponse,
			);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(result[0]).toHaveProperty('name');
			expect(result[0]).toHaveProperty('value');
		});

		test('should include model metadata in name', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextModelsResponse,
			);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			// Should include context length in name
			expect(result[0].name).toContain('4096 tokens');
		});

		test('should return fallback models on API error', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('API Error'),
			);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
			// Should have fallback options
			expect(result.some((opt) => opt.value === 'gpt-3.5-turbo')).toBe(true);
		});

		test('should use correct API endpoint', async () => {
			const mockFunctions = createMockLoadOptionsFunctions({
				getCredentials: jest.fn().mockResolvedValue({
					apiKey: 'test-key',
					environment: 'production',
				}),
			});
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockTextModelsResponse,
			);

			await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					url: expect.stringContaining('/v1/models'),
				}),
			);
		});
	});

	describe('getChutesImageModels', () => {
		test('should load image models from API', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockImageModelsResponse,
			);

			const result = await loadOptions.getChutesImageModels.call(mockFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		test('should format image model options', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockImageModelsResponse,
			);

			const result = await loadOptions.getChutesImageModels.call(mockFunctions);

			expect(result[0]).toHaveProperty('name');
			expect(result[0]).toHaveProperty('value');
			expect(result[0]).toHaveProperty('description');
		});

		test('should return fallback image models on API error', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('API Error'),
			);

		const result = await loadOptions.getChutesImageModels.call(mockFunctions);

		expect(result).toBeDefined();
		expect(result.length).toBeGreaterThan(0);
		// Should return "Default (selected by chute)" option when image endpoint returns 404
		expect(result.some((opt) => opt.name.includes('Default'))).toBe(true);
	});
		test('falls back to unauthenticated request on recoverable discovery error', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 401,
				message: 'invalid token',
			});
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue(mockTextModelsResponse);

			const result = await loadOptions.getModelsForSelectedChute.call({
				...mockFunctions,
				getCurrentNodeParameter: jest.fn().mockReturnValue('https://llm.chutes.ai'),
			} as any);

			expect(mockFunctions.helpers.request).toHaveBeenCalled();
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe('getModelsForSelectedChute', () => {
		test('returns prompt when chute URL is whitespace-only', async () => {
			const mockFunctions = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue('   '),
			});

			const result = await loadOptions.getModelsForSelectedChute.call(mockFunctions as any);

			expect(result[0].name).toContain('Please select a chute first');
		});

		test('returns fallback default when chute models endpoint is unavailable', async () => {
			const mockFunctions = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue('https://example.chutes.ai'),
			});
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('not found'),
			);

			const result = await loadOptions.getModelsForSelectedChute.call(mockFunctions as any);

			expect(result[0].name).toContain('Default (selected by chute)');
			expect(result[0].value).toBe('');
		});

		test('falls back to unauthenticated request on recoverable 403 error', async () => {
			const mockFunctions = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue('https://llm.chutes.ai'),
			});
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				httpCode: 403,
				description: 'forbidden',
			});
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue({
				data: [{ id: 'model-x', name: 'Model X' }],
			});

			const result = await loadOptions.getModelsForSelectedChute.call(mockFunctions as any);

			expect(mockFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({ url: 'https://llm.chutes.ai/v1/models' }),
			);
			expect(result[0].value).toBe('model-x');
		});
	});
});

