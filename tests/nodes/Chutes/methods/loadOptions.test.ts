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

		test('returns prompt when chuteUrl parameter read throws', async () => {
			const mockFunctions = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn(() => {
					throw new Error('parameter unavailable');
				}),
			});

			const result = await loadOptions.getModelsForSelectedChute.call(mockFunctions as any);
			expect(result[0].name).toContain('Please select a chute first');
		});

		test('returns fixed-model default when models endpoint returns empty list', async () => {
			const mockFunctions = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue('https://llm.chutes.ai'),
			});
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ data: [] });

			const result = await loadOptions.getModelsForSelectedChute.call(mockFunctions as any);
			expect(result[0].name).toContain('Default (chute has fixed model)');
		});

		test('maps model description fallback pricing chain for selected chute', async () => {
			const mockFunctions = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue('https://llm.chutes.ai'),
			});
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				data: [
					{ id: 'a', pricing: { generation: '0.2' } },
					{ id: 'b' },
				],
			});

			const result = await loadOptions.getModelsForSelectedChute.call(mockFunctions as any);
			expect(result[0].description).toContain('0.2');
			expect(result[1].description).toContain('N/A');
		});
	});

	describe('branch coverage hardening', () => {
		test('getChutesTextModels supports array responses and all type predicates', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue([
				{ id: 'tNoType' },
				{ id: 't0', type: '', pricing: { input: '1' } },
				{ id: 't1', type: 'text' },
				{ id: 't2', type: 'chat' },
				{ id: 't3', type: 'llm' },
				{ id: 't4', type: 'vision' },
			]);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);
			expect(result.map((r) => r.value)).toEqual(['tNoType', 't0', 't1', 't2', 't3']);
		});

		test('getChutesTextModels recoverable errors use unauthenticated fallback', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				response: { status: 401 },
				error: { detail: 'unauthorized' },
			});
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue([{ id: 'fallback', type: 'text' }]);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);
			expect(mockFunctions.helpers.request).toHaveBeenCalled();
			expect(result[0].value).toBe('fallback');
		});

		test('getChutesTextModels handles non-array API payload via fallback list', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ foo: 'bar' });

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);
			expect(result).toEqual([]);
		});

		test('getChutesTextModels handles null payload and non-object recoverable check input', async () => {
			const nullPayloadFns = createMockLoadOptionsFunctions();
			(nullPayloadFns.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(null);
			await expect(loadOptions.getChutesTextModels.call(nullPayloadFns)).resolves.toEqual([]);

			const nonObjectErrFns = createMockLoadOptionsFunctions();
			(nonObjectErrFns.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue('boom');
			const result = await loadOptions.getChutesTextModels.call(nonObjectErrFns);
			expect(result.some((m) => m.value === 'gpt-3.5-turbo')).toBe(true);
		});

		test('getChutesTextModels evaluates error.detail branch on non-401/403 errors', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 500,
				error: { detail: 'upstream failure' },
			});

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);
			expect(result.some((m) => m.value === 'gpt-4')).toBe(true);
		});

		test('getChutesImageModels covers vision and dalle types', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				data: [
					{ id: 'i0' },
					{ id: 'i1', type: 'vision', pricing: { generation: '2' } },
					{ id: 'i2', type: 'dalle' },
					{ id: 'i3', type: 'text' },
				],
			});

			const result = await loadOptions.getChutesImageModels.call(mockFunctions);
			expect(result.map((r) => r.value)).toEqual(['i0', 'i1', 'i2']);
		});

		test('getChutesImageModels recoverable errors skip console error', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
			try {
				(mockFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
					status: 403,
					error: { detail: 'forbidden' },
				});
				const result = await loadOptions.getChutesImageModels.call(mockFunctions);
				expect(result[0].name).toContain('Default');
			} finally {
				consoleSpy.mockRestore();
			}
		});
	});
});

