/**
 * Tests for Load Options Methods
 * Following TDD principles - all tests in /tests directory
 */

import * as loadOptions from '../../../../nodes/Chutes/methods/loadOptions';
import { createMockLoadOptionsFunctions } from '../../../helpers/mocks';
import { mockTextModelsResponse, mockImageModelsResponse } from '../../../helpers/fixtures';

describe('Load Options Methods', () => {
	describe('getChutesTextModels', () => {
		test('should load text models from API', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue(mockTextModelsResponse);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		test('should format model options with name and value', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue(mockTextModelsResponse);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(result[0]).toHaveProperty('name');
			expect(result[0]).toHaveProperty('value');
		});

		test('should include model metadata in name', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue(mockTextModelsResponse);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			// Should include context length in name
			expect(result[0].name).toContain('4096 tokens');
		});

		test('should return fallback models on API error', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.request as jest.Mock).mockRejectedValue(
				new Error('API Error'),
			);

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
			// Should have fallback options
			expect(result.some((opt) => opt.value === 'gpt-3.5-turbo')).toBe(true);
		});

		test('should fall back to the public text model catalog when credentials are not attached yet', async () => {
			const request = jest.fn().mockResolvedValue(mockTextModelsResponse);
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValue(new Error('Node does not have any credentials set'));
			const mockFunctions = createMockLoadOptionsFunctions({
				helpers: {
					request,
					requestWithAuthentication,
				} as any,
			});

			const result = await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					url: 'https://llm.chutes.ai/v1/models',
				}),
			);
			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://llm.chutes.ai/v1/models',
				}),
			);
			expect(result[0]).toHaveProperty('value', 'gpt-3.5-turbo');
		});

		test('should use correct API endpoint', async () => {
			const mockFunctions = createMockLoadOptionsFunctions({
				getCredentials: jest.fn().mockResolvedValue({
					apiKey: 'test-key',
					environment: 'production',
				}),
			});
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue(mockTextModelsResponse);

			await loadOptions.getChutesTextModels.call(mockFunctions);

			expect(mockFunctions.helpers.request).toHaveBeenCalledWith(
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
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue(mockImageModelsResponse);

			const result = await loadOptions.getChutesImageModels.call(mockFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		test('should format image model options', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.request as jest.Mock).mockResolvedValue(mockImageModelsResponse);

			const result = await loadOptions.getChutesImageModels.call(mockFunctions);

			expect(result[0]).toHaveProperty('name');
			expect(result[0]).toHaveProperty('value');
			expect(result[0]).toHaveProperty('description');
		});

		test('should return fallback image models on API error', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			(mockFunctions.helpers.request as jest.Mock).mockRejectedValue(
				new Error('API Error'),
			);

		const result = await loadOptions.getChutesImageModels.call(mockFunctions);

		expect(result).toBeDefined();
		expect(result.length).toBeGreaterThan(0);
		// Should return "Default (selected by chute)" option when image endpoint returns 404
		expect(result.some((opt) => opt.name.includes('Default'))).toBe(true);
	});

		test('should return the default image option when credentials are not attached yet', async () => {
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValue(new Error('Node does not have any credentials set'));
			const mockFunctions = createMockLoadOptionsFunctions({
				helpers: {
					request: jest.fn(),
					requestWithAuthentication,
				} as any,
			});

			const result = await loadOptions.getChutesImageModels.call(mockFunctions);

			expect(result).toEqual([
				expect.objectContaining({
					name: 'Default (selected by chute)',
					value: '',
				}),
			]);
		});
	});

	describe('getModelsForSelectedChute', () => {
		test('should fall back to the public chute model catalog when credentials are not attached yet', async () => {
			const request = jest.fn().mockResolvedValue(mockTextModelsResponse);
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValue(new Error('Node does not have any credentials set'));
			const mockFunctions = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue('https://llm.chutes.ai'),
				helpers: {
					request,
					requestWithAuthentication,
				} as any,
			});

			const result = await loadOptions.getModelsForSelectedChute.call(mockFunctions);

			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://llm.chutes.ai/v1/models',
				}),
			);
			expect(result[0]).toHaveProperty('value', 'gpt-3.5-turbo');
		});
	});
});
