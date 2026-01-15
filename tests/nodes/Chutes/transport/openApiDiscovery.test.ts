/**
 * Unit Tests for OpenAPI Discovery Module
 * 
 * TDD: Tests written FIRST, before implementation
 */

import { discoverChuteCapabilities, buildRequestBody, clearSchemaCache } from '../../../../nodes/Chutes/transport/openApiDiscovery';
import { IDataObject } from 'n8n-workflow';

// Mock fetch globally
global.fetch = jest.fn();

describe('OpenAPI Discovery Module', () => {
	beforeEach(() => {
		// Clear cache before each test
		clearSchemaCache();
		// Reset fetch mock
		(global.fetch as jest.Mock).mockReset();
	});

	describe('discoverChuteCapabilities', () => {
		it('should fetch and parse OpenAPI schema successfully', async () => {
			const mockSchema = {
				openapi: '3.1.0',
				paths: {
					'/generate': {
						post: {
							requestBody: {
								content: {
									'application/json': {
										schema: {
											properties: {
												prompt: { type: 'string' },
												image: { type: 'string' },
											},
											required: ['prompt'],
										},
									},
								},
							},
							responses: {
								'200': {
									content: {
										'video/mp4': {},
									},
								},
							},
						},
					},
				},
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockSchema,
			});

			const capabilities = await discoverChuteCapabilities(
				'https://test-chute.chutes.ai',
				'test-api-key'
			);

			expect(capabilities.endpoints).toHaveLength(1);
			expect(capabilities.endpoints[0].path).toBe('/generate');
			expect(capabilities.endpoints[0].parameters).toContainEqual({
				name: 'prompt',
				required: true,
				type: 'string',
			});
		});

		it('should detect text-to-video capability', async () => {
			const mockSchema = {
				openapi: '3.1.0',
				paths: {
					'/text2video': {
						post: {
							requestBody: {
								content: {
									'application/json': {
										schema: {
											properties: {
												prompt: { type: 'string' },
											},
										},
									},
								},
							},
						},
					},
				},
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockSchema,
			});

			const capabilities = await discoverChuteCapabilities(
				'https://t2v-chute.chutes.ai',
				'test-api-key'
			);

			expect(capabilities.supportsTextToVideo).toBe(true);
			expect(capabilities.textToVideoPath).toBe('/text2video');
		});

		it('should detect image-to-video capability', async () => {
			const mockSchema = {
				openapi: '3.1.0',
				paths: {
					'/image2video': {
						post: {
							requestBody: {
								content: {
									'application/json': {
										schema: {
											properties: {
												prompt: { type: 'string' },
												image_b64: { type: 'string' },
											},
										},
									},
								},
							},
						},
					},
				},
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockSchema,
			});

			const capabilities = await discoverChuteCapabilities(
				'https://i2v-chute.chutes.ai',
				'test-api-key'
			);

			expect(capabilities.supportsImageToVideo).toBe(true);
			expect(capabilities.imageToVideoPath).toBe('/image2video');
		});

		it('should detect dual capability (both T2V and I2V)', async () => {
			const mockSchema = {
				openapi: '3.1.0',
				paths: {
					'/text2video': {
						post: {
							requestBody: {
								content: {
									'application/json': {
										schema: {
											properties: {
												prompt: { type: 'string' },
											},
										},
									},
								},
							},
						},
					},
					'/image2video': {
						post: {
							requestBody: {
								content: {
									'application/json': {
										schema: {
											properties: {
												prompt: { type: 'string' },
												image_b64: { type: 'string' },
											},
										},
									},
								},
							},
						},
					},
				},
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockSchema,
			});

			const capabilities = await discoverChuteCapabilities(
				'https://dual-chute.chutes.ai',
				'test-api-key'
			);

			expect(capabilities.supportsTextToVideo).toBe(true);
			expect(capabilities.supportsImageToVideo).toBe(true);
		});

		it('should handle fetch failure gracefully with fallback endpoints', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			const capabilities = await discoverChuteCapabilities(
				'https://broken-chute.chutes.ai',
				'test-api-key'
			);

			// Should provide fallback endpoints even when fetch fails
			expect(capabilities.endpoints.length).toBeGreaterThan(0);
			expect(capabilities.supportsTextToVideo).toBe(true);
			expect(capabilities.supportsImageToVideo).toBe(true);
			// Should have common fallback endpoints
			expect(capabilities.endpoints.some(e => e.path === '/generate')).toBe(true);
			expect(capabilities.endpoints.some(e => e.path === '/text2video')).toBe(true);
			expect(capabilities.endpoints.some(e => e.path === '/image2video')).toBe(true);
		});

		it('should cache schema for subsequent calls', async () => {
			const mockSchema = {
				openapi: '3.1.0',
				paths: {
					'/generate': {
						post: {},
					},
				},
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockSchema,
			});

			// First call - should fetch
			await discoverChuteCapabilities('https://cached-chute.chutes.ai', 'test-api-key');
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Second call - should use cache
			await discoverChuteCapabilities('https://cached-chute.chutes.ai', 'test-api-key');
			expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1!

			// Different chute - should fetch again
			await discoverChuteCapabilities('https://other-chute.chutes.ai', 'test-api-key');
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('buildRequestBody', () => {
		it('should build request for text-to-video with discovered endpoint', () => {
			const capabilities = {
				endpoints: [
					{
						path: '/text2video',
						method: 'POST',
						parameters: [
							{ name: 'prompt', required: true, type: 'string' },
							{ name: 'frames', required: false, type: 'number' },
							{ name: 'fps', required: false, type: 'number' },
						],
					},
			],
				supportsTextToVideo: true,
				supportsImageToVideo: false,
				supportsImageEdit: false,
				supportsVideoToVideo: false,
				supportsKeyframeInterp: false,
				textToVideoPath: '/text2video',
		};

		const userInputs: IDataObject = {
			prompt: 'a cat playing',
			frames: 81,
			fps: 24,
		};

	const result = buildRequestBody('text2video', capabilities, userInputs);

		expect(result).not.toBeNull();
		expect(result?.endpoint).toBe('/text2video');
		// All Chutes.ai endpoints use flat parameters (proven by working direct API tests)
		expect(result?.body).toEqual({
			prompt: 'a cat playing',
			frames: 81,
			fps: 24,
		});
	});

	it('should build request for image-to-video', () => {
		const capabilities = {
			endpoints: [
				{
					path: '/image2video',
					method: 'POST',
					parameters: [
						{ name: 'prompt', required: true, type: 'string' },
						{ name: 'image_b64', required: true, type: 'string' },
					],
				},
			],
			supportsTextToVideo: false,
			supportsImageToVideo: true,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			imageToVideoPath: '/image2video',
		};

			const userInputs: IDataObject = {
				prompt: 'animate this',
				image: 'base64encodedimage',
			};

		const result = buildRequestBody('image2video', capabilities, userInputs);

		expect(result).not.toBeNull();
		expect(result?.endpoint).toBe('/image2video');
		// All Chutes.ai endpoints use flat parameters (proven by working direct API tests)
		expect(result?.body.prompt).toBe('animate this');
		expect(result?.body.image_b64).toBe('base64encodedimage');
	});

	it('should map parameter names dynamically', () => {
		const capabilities = {
			endpoints: [
				{
					path: '/generate',
					method: 'POST',
					parameters: [
						{ name: 'text', required: true, type: 'string' }, // Uses 'text' not 'prompt'!
						{ name: 'image', required: false, type: 'string' },
					],
				},
			],
				supportsTextToVideo: false,
				supportsImageToVideo: true,
				supportsImageEdit: false,
				supportsVideoToVideo: false,
				supportsKeyframeInterp: false,
				imageToVideoPath: '/generate',
		};

			const userInputs: IDataObject = {
				prompt: 'test prompt',
				image: 'test-image',
			};

		const result = buildRequestBody('image2video', capabilities, userInputs);

		// All Chutes.ai endpoints use flat parameters (proven by working direct API tests)
		expect(result?.body.text).toBe('test prompt'); // Mapped prompt -> text
		expect(result?.body.image).toBe('test-image');
	});

	it('should fallback to common endpoint if no specific path found', () => {
		const capabilities = {
			endpoints: [
				{
					path: '/generate',
					method: 'POST',
					parameters: [],
				},
			],
				supportsTextToVideo: false,
				supportsImageToVideo: false,
				supportsImageEdit: false,
				supportsVideoToVideo: false,
				supportsKeyframeInterp: false,
			};

			const userInputs: IDataObject = {
				prompt: 'test',
			};

			const result = buildRequestBody('text2video', capabilities, userInputs);

			expect(result).not.toBeNull();
			expect(result?.endpoint).toBe('/generate'); // Fallback
		});

	it('should return fallback endpoint even with empty capabilities', () => {
		const capabilities = {
			endpoints: [],
				supportsTextToVideo: false,
				supportsImageToVideo: false,
				supportsImageEdit: false,
				supportsVideoToVideo: false,
				supportsKeyframeInterp: false,
			};

			const userInputs: IDataObject = {
				prompt: 'test',
			};

		const result = buildRequestBody('text2video', capabilities, userInputs);

		// Should return fallback endpoint
		expect(result).not.toBeNull();
		expect(result?.endpoint).toBe('/text2video');
		// All Chutes.ai endpoints use flat parameters (proven by working direct API tests)
		expect(result?.body).toEqual({ prompt: 'test' });
	});
	});

	describe('clearSchemaCache', () => {
		it('should clear all cached schemas', async () => {
			const mockSchema = {
				openapi: '3.1.0',
				paths: {},
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockSchema,
			});

			// Cache a schema
			await discoverChuteCapabilities('https://cached.chutes.ai', 'key');
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Clear cache
			clearSchemaCache();

			// Next call should fetch again
			await discoverChuteCapabilities('https://cached.chutes.ai', 'key');
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});

		it('should clear specific chute cache', async () => {
			const mockSchema = {
				openapi: '3.1.0',
				paths: {},
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockSchema,
			});

			// Cache two schemas
			await discoverChuteCapabilities('https://chute1.chutes.ai', 'key');
			await discoverChuteCapabilities('https://chute2.chutes.ai', 'key');
			expect(global.fetch).toHaveBeenCalledTimes(2);

			// Clear only chute1
			clearSchemaCache('https://chute1.chutes.ai');

			// chute1 should fetch again, chute2 should use cache
			await discoverChuteCapabilities('https://chute1.chutes.ai', 'key');
			await discoverChuteCapabilities('https://chute2.chutes.ai', 'key');
			expect(global.fetch).toHaveBeenCalledTimes(3); // +1 for chute1 only
		});
	});
});

