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

		it('should support callback-based schema loading', async () => {
			const mockLoader = jest.fn().mockResolvedValue({
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
											},
										},
									},
								},
							},
						},
					},
				},
			});

			const capabilities = await discoverChuteCapabilities(
				'https://callback-chute.chutes.ai',
				mockLoader,
			);

			expect(mockLoader).toHaveBeenCalledWith('https://callback-chute.chutes.ai/openapi.json');
			expect(capabilities.endpoints.some((endpoint) => endpoint.path === '/generate')).toBe(true);
		});

		it('falls back when fetch responds non-ok', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 503,
			});

			const capabilities = await discoverChuteCapabilities('https://non-ok.chutes.ai', 'key');
			expect(capabilities.endpoints.some((e) => e.path === '/generate')).toBe(true);
		});

		it('handles broken placeholder schemas by using fallback endpoints', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					openapi: '3.1.0',
					paths: {
						'{path}': {
							post: {
								requestBody: {
									content: {
										'application/json': { schema: { properties: { prompt: { type: 'string' } } } },
									},
								},
							},
						},
					},
				}),
			});

			const capabilities = await discoverChuteCapabilities('https://broken-schema.chutes.ai', 'key');
			expect(capabilities.endpoints.some((e) => e.path === '/text2video')).toBe(true);
		});

		it('unwraps input_args nested schema properties', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					openapi: '3.1.0',
					paths: {
						'/generate': {
							post: {
								requestBody: {
									content: {
										'application/json': {
											schema: {
												properties: {
													input_args: {
														type: 'object',
														properties: {
															prompt: { type: 'string' },
															image_b64: { type: 'string' },
														},
														required: ['prompt'],
													},
												},
											},
										},
									},
								},
							},
						},
					},
				}),
			});

			const capabilities = await discoverChuteCapabilities('https://nested-args.chutes.ai', 'key');
			const endpoint = capabilities.endpoints.find((e) => e.path === '/generate');
			expect(endpoint?.parameters).toContainEqual({ name: 'prompt', required: true, type: 'string' });
			expect(endpoint?.parameters).toContainEqual({
				name: 'image_b64',
				required: false,
				type: 'string',
			});
		});

		it('handles schemas without paths object', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({ openapi: '3.1.0' }),
			});

			const capabilities = await discoverChuteCapabilities('https://no-paths.chutes.ai', 'key');
			expect(capabilities.endpoints.some((e) => e.path === '/generate')).toBe(true);
		});

		it('ignores non-post/put methods while scanning paths', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					openapi: '3.1.0',
					paths: {
						'/generate': {
							get: {},
							post: {
								requestBody: {
									content: {
										'application/json': {
											schema: { properties: { prompt: { type: 'string' } } },
										},
									},
								},
							},
						},
					},
				}),
			});

			const capabilities = await discoverChuteCapabilities('https://method-scan.chutes.ai', 'key');
			expect(capabilities.endpoints).toHaveLength(1);
			expect(capabilities.endpoints[0].method).toBe('POST');
		});

		it('detects image edit support via edit-like v1 path and image parameters', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					openapi: '3.1.0',
					paths: {
						'/v1/foo-edit-bar': {
							post: {
								requestBody: {
									content: {
										'application/json': {
											schema: {
												properties: {
													prompt: { type: 'string' },
													image: { type: 'string' },
												},
											},
										},
									},
								},
							},
						},
					},
				}),
			});

			const capabilities = await discoverChuteCapabilities('https://edit-like.chutes.ai', 'key');
			expect(capabilities.supportsImageEdit).toBe(true);
			expect(capabilities.imageEditPath).toBe('/v1/foo-edit-bar');
		});

		it('supports callback loader when schema has no paths', async () => {
			const mockLoader = jest.fn().mockResolvedValue({ openapi: '3.1.0' });
			const capabilities = await discoverChuteCapabilities('https://callback-no-paths.chutes.ai', mockLoader);
			expect(capabilities.endpoints.some((e) => e.path === '/generate')).toBe(true);
		});

		it('handles non-json requestBody content without extracting params', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					openapi: '3.1.0',
					paths: {
						'/generate': {
							post: {
								requestBody: {
									content: {
										'text/plain': {},
									},
								},
							},
						},
					},
				}),
			});

			const capabilities = await discoverChuteCapabilities('https://no-json-body.chutes.ai', 'key');
			expect(capabilities.endpoints[0].parameters).toEqual([]);
		});

		it('defaults nested input_args required/type values when omitted', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					openapi: '3.1.0',
					paths: {
						'/generate': {
							post: {
								requestBody: {
									content: {
										'application/json': {
											schema: {
												properties: {
													input_args: {
														type: 'object',
														properties: {
															prompt: {},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				}),
			});
			const capabilities = await discoverChuteCapabilities('https://nested-defaults.chutes.ai', 'key');
			expect(capabilities.endpoints[0].parameters).toContainEqual({
				name: 'prompt',
				required: false,
				type: 'string',
			});
		});

		it('does not flag image edit when image_b64s exists but is not array type', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
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
													image_b64s: { type: 'string' },
												},
											},
										},
									},
								},
							},
						},
					},
				}),
			});
			const capabilities = await discoverChuteCapabilities('https://not-array.chutes.ai', 'key');
			expect(capabilities.imageEditPath).toBe('/edit');
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

	it('uses fallback /edit endpoint for image edit when no endpoints exist', () => {
		const capabilities = {
			endpoints: [],
			supportsTextToVideo: false,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
		};
		const result = buildRequestBody('edit', capabilities, { prompt: 'x', image: 'b64' });
		expect(result?.endpoint).toBe('/edit');
	});

	it('routes video2video and keyframe to /generate fallback', () => {
		const capabilities = {
			endpoints: [{ path: '/generate', method: 'POST', parameters: [] }],
			supportsTextToVideo: false,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: true,
			supportsKeyframeInterp: true,
		};
		const v2v = buildRequestBody('video2video', capabilities, { prompt: 'v', video_b64: 'x' });
		const keyframe = buildRequestBody('keyframe', capabilities, {
			prompt: 'k',
			image_b64s: ['a', 'b'],
		});
		expect(v2v?.endpoint).toBe('/generate');
		expect(keyframe?.endpoint).toBe('/generate');
	});

	it('converts resolution for ltx chutes and maps size for /v1 endpoints', () => {
		const capabilities = {
			endpoints: [
				{
					path: '/v1/images/edits',
					method: 'POST',
					parameters: [
						{ name: 'size', required: false, type: 'string' },
						{ name: 'prompt', required: false, type: 'string' },
					],
				},
			],
			supportsTextToVideo: false,
			supportsImageToVideo: false,
			supportsImageEdit: true,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			imageEditPath: '/v1/images/edits',
		};
		const result = buildRequestBody(
			'edit',
			capabilities,
			{ prompt: 'x', resolution: '1000*1001', width: 1000, height: 1001 },
			'https://chutes-ltx-2.chutes.ai',
		);
		expect(result?.endpoint).toBe('/v1/images/edits');
		expect(result?.body.size).toBe('1000x1001');
		expect(result?.body).not.toHaveProperty('width');
		expect(result?.body).not.toHaveProperty('height');
	});

	it('skips unmapped fields for strict /v1 endpoints and keeps for custom paths', () => {
		const strictCapabilities = {
			endpoints: [
				{
					path: '/v1/images/edits',
					method: 'POST',
					parameters: [{ name: 'prompt', required: true, type: 'string' }],
				},
			],
			supportsTextToVideo: false,
			supportsImageToVideo: false,
			supportsImageEdit: true,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			imageEditPath: '/v1/images/edits',
		};
		const strictResult = buildRequestBody('edit', strictCapabilities, {
			prompt: 'x',
			unmapped: 'drop-me',
		});
		expect(strictResult?.body.unmapped).toBeUndefined();

		const permissiveCapabilities = {
			...strictCapabilities,
			endpoints: [{ path: '/generate', method: 'POST', parameters: [] }],
			imageEditPath: '/generate',
		};
		const permissiveResult = buildRequestBody('edit', permissiveCapabilities, {
			prompt: 'x',
			unmapped: 'keep-me',
		});
		expect(permissiveResult?.body.unmapped).toBe('keep-me');
	});

	it('converts singular image to image_b64s for image edit when endpoint expects array', () => {
		const capabilities = {
			endpoints: [
				{
					path: '/generate',
					method: 'POST',
					parameters: [
						{ name: 'prompt', required: true, type: 'string' },
						{ name: 'image_b64s', required: false, type: 'array' },
					],
				},
			],
			supportsTextToVideo: false,
			supportsImageToVideo: false,
			supportsImageEdit: true,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			imageEditPath: '/generate',
		};
		const editResult = buildRequestBody('edit', capabilities, { prompt: 'x', image: 'abc' });
		expect(editResult?.body.image_b64s).toEqual(['abc']);
		expect(editResult?.body.image).toBeUndefined();

		const i2vResult = buildRequestBody('image2video', capabilities, { prompt: 'x', image: 'abc' });
		expect(i2vResult?.body.image).toBe('abc');
	});

	it('prefers /v1/images/edits as edit fallback and then /generate fallback', () => {
		const v1Capabilities = {
			endpoints: [{ path: '/v1/images/edits', method: 'POST', parameters: [] }],
			supportsTextToVideo: false,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
		};
		const v1Result = buildRequestBody('edit', v1Capabilities, { prompt: 'x' });
		expect(v1Result?.endpoint).toBe('/v1/images/edits');

		const genCapabilities = {
			...v1Capabilities,
			endpoints: [{ path: '/generate', method: 'POST', parameters: [] }],
		};
		const genResult = buildRequestBody('edit', genCapabilities, { prompt: 'x' });
		expect(genResult?.endpoint).toBe('/generate');
	});

	it('supports image_edit alias operation in endpoint selection and fallback', () => {
		const caps = {
			endpoints: [],
			supportsTextToVideo: false,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
		};
		const result = buildRequestBody('image_edit', caps, { prompt: 'x' });
		expect(result?.endpoint).toBe('/edit');
	});

	it('maps text-only /generate endpoint for text2video fallback detection', () => {
		const caps = {
			endpoints: [
				{
					path: '/generate',
					method: 'POST',
					parameters: [{ name: 'text', required: true, type: 'string' }],
				},
			],
			supportsTextToVideo: true,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
		};
		const result = buildRequestBody('text2video', caps, { prompt: 'x' });
		expect(result?.endpoint).toBe('/generate');
		expect(result?.body.text).toBe('x');
	});

	it('keeps width/height when endpoint supports size and width/height', () => {
		const caps = {
			endpoints: [
				{
					path: '/v1/images/edits',
					method: 'POST',
					parameters: [
						{ name: 'size', required: false, type: 'string' },
						{ name: 'width', required: false, type: 'integer' },
						{ name: 'height', required: false, type: 'integer' },
					],
				},
			],
			supportsTextToVideo: false,
			supportsImageToVideo: false,
			supportsImageEdit: true,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			imageEditPath: '/v1/images/edits',
		};
		const result = buildRequestBody('edit', caps, { width: 800, height: 600 });
		expect(result?.body.size).toBe('800x600');
		expect(result?.body.width).toBe(800);
		expect(result?.body.height).toBe(600);
	});

	it('leaves malformed resolution unchanged when split tokenization fails', () => {
		const caps = {
			endpoints: [
				{
					path: '/generate',
					method: 'POST',
					parameters: [
						{ name: 'width', required: false, type: 'integer' },
						{ name: 'height', required: false, type: 'integer' },
						{ name: 'resolution', required: false, type: 'string' },
					],
				},
			],
			supportsTextToVideo: true,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			textToVideoPath: '/generate',
		};
		const result = buildRequestBody('text2video', caps, { resolution: 'bad-format' });
		expect(result?.body.resolution).toBe('bad-format');
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

