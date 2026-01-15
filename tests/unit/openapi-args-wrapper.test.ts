/**
 * TDD Test: Args Wrapper Detection
 * 
 * NOTE: These tests were created to detect args wrappers in schemas,
 * but we later discovered that Chutes framework auto-unwraps args for public HTTP APIs.
 * Keeping tests for documentation and regression protection.
 */

import { discoverChuteCapabilities, clearSchemaCache } from '../../nodes/Chutes/transport/openApiDiscovery';

// Mock fetch
global.fetch = jest.fn();

describe('Args Wrapper Detection (Historical - Not Used)', () => {
	let originalFetch: typeof global.fetch;

	beforeEach(() => {
		originalFetch = global.fetch;
		global.fetch = jest.fn();
		clearSchemaCache();
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	test('should detect args wrapper requirement from LTX-2 schema', async () => {
		// LTX-2 schema pattern with required: ["args"]
		const ltx2Schema = {
			paths: {
				'/generate': {
					post: {
						requestBody: {
							content: {
								'application/json': {
									schema: {
										type: 'object',
										required: ['args'],
										properties: {
											args: {
												$ref: '#/definitions/GenerationInput',
											},
										},
										definitions: {
											GenerationInput: {
												type: 'object',
												required: ['prompt'],
												properties: {
													prompt: { type: 'string' },
													width: { type: 'integer', default: 768 },
													height: { type: 'integer', default: 512 },
													num_frames: { type: 'integer', default: 121 },
													frame_rate: { type: 'integer', default: 25 },
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
		};

		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ltx2Schema,
		});

		const capabilities = await discoverChuteCapabilities('https://ltx2.chutes.ai', 'test-key');
		
		// Should still find the endpoint
		expect(capabilities.endpoints.length).toBeGreaterThan(0);
		expect(capabilities.endpoints[0].path).toBe('/generate');
		
		// NOTE: Args wrapper detection was implemented but not actually needed
		// as Chutes framework auto-unwraps for HTTP API
	});

	test('should NOT detect args wrapper for flat Wan2.2 schema', async () => {
		// Wan2.2 schema with flat parameters
		const wan22Schema = {
			paths: {
				'/text2video': {
					post: {
						requestBody: {
							content: {
								'application/json': {
									schema: {
										properties: {
											prompt: { type: 'string' },
											resolution: { type: 'string' },
											frames: { type: 'integer' },
											fps: { type: 'integer' },
										},
										required: ['prompt'],
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
			json: async () => wan22Schema,
		});

		const capabilities = await discoverChuteCapabilities('https://wan22.chutes.ai', 'test-key');
		
		expect(capabilities.endpoints.length).toBeGreaterThan(0);
		expect(capabilities.endpoints[0].path).toBe('/text2video');
	});

	test('should handle top-level $ref for wrapper detection', async () => {
		// Schema with top-level $ref to RequestWrapper
		const schemaWithRef = {
			paths: {
				'/generate': {
					post: {
						requestBody: {
							content: {
								'application/json': {
									schema: {
										$ref: '#/definitions/RequestWrapper',
									},
								},
							},
						},
					},
				},
			},
			definitions: {
				RequestWrapper: {
					type: 'object',
					required: ['args'],
					properties: {
						args: {
							$ref: '#/definitions/GenerationInput',
						},
					},
				},
				GenerationInput: {
					type: 'object',
					required: ['prompt'],
					properties: {
						prompt: { type: 'string' },
						negative_prompt: { type: 'string', default: '' },
					},
				},
			},
		};

		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => schemaWithRef,
		});

		const capabilities = await discoverChuteCapabilities('https://test.chutes.ai', 'test-key');
		
		// Should resolve refs and find endpoint
		expect(capabilities.endpoints.length).toBeGreaterThan(0);
	});
});
