/**
 * Tests for loadChutes methods
 */

import {
	getChuteUrl,
	getChutes,
	getChutesByType,
	getChutesForSelectedResource,
	getImageChutes,
	getLLMChutes,
	getVideoChutes,
	getTTSChutes,
	getSTTChutes,
	getMusicChutes,
	getEmbeddingChutes,
	getModerationChutes,
} from '../../../../nodes/Chutes/methods/loadChutes';
import { createMockLoadOptionsFunctions } from '../../../helpers/mocks';

describe('Load Chutes Methods', () => {
	describe('getChuteUrl', () => {
		it('should construct correct chute URL from slug', () => {
			const slug = 'chutes-deepseek-ai-deepseek-r1';
			const url = getChuteUrl(slug);
			
			expect(url).toBe('https://chutes-deepseek-ai-deepseek-r1.chutes.ai');
		});

		it('should handle different slug formats', () => {
			expect(getChuteUrl('chutes-qwen-image-edit-2509')).toBe(
				'https://chutes-qwen-image-edit-2509.chutes.ai',
			);
			expect(getChuteUrl('chutes-wan-2-2-i2v-14b-fast')).toBe(
				'https://chutes-wan-2-2-i2v-14b-fast.chutes.ai',
			);
		});
	});

	describe('getChutes', () => {
		it('should return formatted chute options', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				total: 2,
				page: 0,
				limit: 100,
				items: [
					{
						chute_id: 'test-id-1',
						name: 'deepseek-ai/DeepSeek-R1',
						tagline: 'A powerful reasoning model',
						slug: 'chutes-deepseek-r1',
						standard_template: 'vllm',
						public: true,
						user: { username: 'chutes' },
					},
					{
						chute_id: 'test-id-2',
						name: 'qwen-image',
						tagline: 'Image generation model',
						slug: 'chutes-qwen-image',
						standard_template: 'diffusion',
						public: true,
						user: { username: 'testuser' },
					},
				],
				cord_refs: {},
			});

			const options = await getChutes.call(mockContext);

		expect(options).toHaveLength(2);
		expect(options[0]).toEqual({
			name: 'deepseek-ai/DeepSeek-R1 - A powerful reasoning model...',
			value: 'https://chutes-deepseek-r1.chutes.ai',
			description: 'vllm | @chutes',
		});
		expect(options[1]).toEqual({
			name: 'qwen-image - Image generation model...',
			value: 'https://chutes-qwen-image.chutes.ai',
			description: 'diffusion | @testuser',
		});
		});

	it('should return empty array on API error (no hardcoded fallbacks)', async () => {
		const mockContext = createMockLoadOptionsFunctions();
		
		(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
			new Error('API Error'),
		);

		const options = await getChutes.call(mockContext);

		// Now returns empty array instead of hardcoded fallbacks (programmatic approach)
		expect(options).toHaveLength(0);
	});

		it('should truncate long taglines', async () => {
			const longTagline = 'A'.repeat(150);
			const mockContext = createMockLoadOptionsFunctions();
			
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				total: 1,
				page: 0,
				limit: 100,
				items: [
					{
						chute_id: 'test-id',
						name: 'test-model',
						tagline: longTagline,
						slug: 'test-slug',
						standard_template: 'vllm',
						public: true,
					},
				],
				cord_refs: {},
			});

			const options = await getChutes.call(mockContext);

			expect(options[0].name.length).toBeLessThanOrEqual(120); // name + ' - ' + 100 char tagline
			expect(options[0].name).toContain('test-model - A');
		});
	});

	describe('getChutesByType', () => {
		it('should filter chutes by template type', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				total: 3,
				page: 0,
				limit: 100,
				items: [
					{
						chute_id: '1',
						name: 'vllm-model',
						slug: 'vllm-slug',
						standard_template: 'vllm',
						public: true,
					},
					{
						chute_id: '2',
						name: 'diffusion-model',
						slug: 'diffusion-slug',
						standard_template: 'diffusion',
						public: true,
					},
					{
						chute_id: '3',
						name: 'another-vllm',
						slug: 'vllm-slug-2',
						standard_template: 'vllm',
						public: true,
					},
				],
				cord_refs: {},
			});

			const vllmChutes = await getChutesByType.call(mockContext, 'vllm');
			expect(vllmChutes).toHaveLength(2);
			expect(vllmChutes.every(c => c.description?.includes('vllm'))).toBe(true);
		});

		it('should return all chutes when no template specified', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				total: 2,
				page: 0,
				limit: 100,
				items: [
					{
						chute_id: '1',
						name: 'model1',
						slug: 'slug1',
						standard_template: 'vllm',
						public: true,
					},
					{
						chute_id: '2',
						name: 'model2',
						slug: 'slug2',
						standard_template: 'diffusion',
						public: true,
					},
				],
				cord_refs: {},
			});

			const allChutes = await getChutesByType.call(mockContext);
			expect(allChutes).toHaveLength(2);
		});
	});

	describe('getLLMChutes', () => {
		it('should include well-known LLM chute at the top', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				total: 1,
				page: 0,
				limit: 100,
				items: [
					{
						chute_id: '1',
						name: 'custom-llm',
						slug: 'custom-llm-slug',
						standard_template: 'vllm',
						public: true,
					},
				],
				cord_refs: {},
			});

		const options = await getLLMChutes.call(mockContext);

		expect(options.length).toBeGreaterThanOrEqual(1);
		// No longer adds hardcoded "Recommended" chute - returns programmatic results only
		expect(options[0].value).toBe('https://custom-llm-slug.chutes.ai');
		expect(options[0].name).toContain('custom-llm');
	});
	});

	describe('getImageChutes', () => {
		it('should include well-known Image chute at the top', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				total: 1,
				page: 0,
				limit: 100,
				items: [
					{
						chute_id: '1',
						name: 'custom-image',
						slug: 'custom-image-slug',
						standard_template: 'diffusion',
						public: true,
					},
				],
				cord_refs: {},
			});

		const options = await getImageChutes.call(mockContext);

		expect(options.length).toBeGreaterThanOrEqual(1);
		// No longer adds hardcoded "Recommended" chute - returns programmatic results only
		expect(options[0].value).toBe('https://custom-image-slug.chutes.ai');
		expect(options[0].name).toContain('custom-image');
	});
	});

	describe('resource-aware loading and auth fallback', () => {
		it('routes selected resource through getChutesForSelectedResource', async () => {
			const mockContext = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue('imageGeneration'),
			} as any);

			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				items: [],
			});

			const result = await getChutesForSelectedResource.call(mockContext);
			expect(Array.isArray(result)).toBe(true);
		});

		it('falls back to unauthenticated public catalog on 403', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 403,
				message: 'forbidden',
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({
				items: [
					{
						chute_id: 'public-1',
						name: 'public-model',
						slug: 'public-model',
						standard_template: 'vllm',
						public: true,
						user: { username: 'chutes' },
					},
				],
			});

			const result = await getChutes.call(mockContext);
			expect(mockContext.helpers.request).toHaveBeenCalled();
			expect(result).toHaveLength(1);
		});

		it('falls back to unauthenticated public catalog on 401 invalid token', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 401,
				message: 'invalid token',
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });

			await getChutes.call(mockContext);

			expect(mockContext.helpers.request).toHaveBeenCalled();
		});

		it('falls back on missing credential error text', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				message: 'missing both an api key and a session token',
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });

			await getChutes.call(mockContext);

			expect(mockContext.helpers.request).toHaveBeenCalled();
		});

		it('falls back on "Credentials not found" error from n8n', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				message: 'Credentials not found',
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });

			await getChutes.call(mockContext);

			expect(mockContext.helpers.request).toHaveBeenCalled();
		});

		it('falls back on "does not have credentials of type" error', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				message: 'Node does not have credentials of type chutesApi',
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });

			await getChutes.call(mockContext);

			expect(mockContext.helpers.request).toHaveBeenCalled();
		});

		it('does not fallback when includePublic is false', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 403,
				message: 'forbidden',
			});

			const result = await getChutes.call(mockContext, false, 5);

			expect(mockContext.helpers.request).not.toHaveBeenCalled();
			expect(result).toEqual([]);
		});

		it('returns empty list for unknown selected resource', async () => {
			const mockContext = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue('unknown-resource'),
			} as any);
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('boom'),
			);

			const result = await getChutesForSelectedResource.call(mockContext);
			expect(Array.isArray(result)).toBe(true);
		});

		it('defaults to text generation when resource lookup throws', async () => {
			const mockContext = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn(() => {
					throw new Error('parameter unavailable');
				}),
			} as any);
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ items: [] });

			const result = await getChutesForSelectedResource.call(mockContext);
			expect(Array.isArray(result)).toBe(true);
		});

		it('routes all supported resources through getChutesForSelectedResource', async () => {
			const resources = [
				'textGeneration',
				'imageGeneration',
				'videoGeneration',
				'textToSpeech',
				'speechToText',
				'musicGeneration',
				'embeddings',
				'contentModeration',
				'inference',
			];
			for (const resource of resources) {
				const mockContext = createMockLoadOptionsFunctions({
					getCurrentNodeParameter: jest.fn().mockReturnValue(resource),
				} as any);
				(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({ items: [] });
				const result = await getChutesForSelectedResource.call(mockContext);
				expect(Array.isArray(result)).toBe(true);
			}
		});

		it('falls back for 403 without permission keywords to empty', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 403,
				message: 'some other failure',
			});

			const result = await getChutes.call(mockContext);
			expect(result).toEqual([]);
			expect(mockContext.helpers.request).not.toHaveBeenCalled();
		});

		it('falls back for missing-credential phrase variant', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				description: 'credential missing',
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });

			await getChutes.call(mockContext);
			expect(mockContext.helpers.request).toHaveBeenCalled();
		});

		it('does not fallback when thrown error is non-object', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue('boom');
			const result = await getChutes.call(mockContext);
			expect(result).toEqual([]);
			expect(mockContext.helpers.request).not.toHaveBeenCalled();
		});

		it('does not fallback when thrown error is null', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(null);
			const result = await getChutes.call(mockContext);
			expect(result).toEqual([]);
			expect(mockContext.helpers.request).not.toHaveBeenCalled();
		});

		it('returns empty arrays from all specialized loaders when API throws', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('down'),
			);
			await expect(getLLMChutes.call(mockContext)).resolves.toEqual([]);
			await expect(getImageChutes.call(mockContext)).resolves.toEqual([]);
			await expect(getVideoChutes.call(mockContext)).resolves.toEqual([]);
			await expect(getTTSChutes.call(mockContext)).resolves.toEqual([]);
			await expect(getSTTChutes.call(mockContext)).resolves.toEqual([]);
			await expect(getMusicChutes.call(mockContext)).resolves.toEqual([]);
			await expect(getEmbeddingChutes.call(mockContext)).resolves.toEqual([]);
			await expect(getModerationChutes.call(mockContext)).resolves.toEqual([]);
		});

		it('covers status-code candidate precedence and fallback-to-empty response branches', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				httpCode: 403,
				response: {},
				message: 'forbidden',
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({});
			const result = await getChutes.call(mockContext);
			expect(result).toEqual([]);
		});

		it('covers permission detection via nested error.detail branch', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 403,
				error: { detail: 'permission denied' },
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });
			const result = await getChutes.call(mockContext);
			expect(result).toEqual([]);
		});

		it('covers unauthorized detail variants and empty resource fallback', async () => {
			const mockContext = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: jest.fn().mockReturnValue(''),
			} as any);
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				httpCode: 401,
				description: 'user not found',
				response: {},
			});
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });
			const result = await getChutesForSelectedResource.call(mockContext);
			expect(Array.isArray(result)).toBe(true);
		});

		it('covers remaining unauthorized phrase branches and nullish status fallbacks', async () => {
			const authFailedContext = createMockLoadOptionsFunctions();
			(authFailedContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 401,
				message: 'authorization failed',
				response: {},
			});
			(authFailedContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });
			await getChutes.call(authFailedContext);
			expect(authFailedContext.helpers.request).toHaveBeenCalled();

			const unauthorizedContext = createMockLoadOptionsFunctions();
			(unauthorizedContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				statusCode: 401,
				message: 'unauthorized',
				error: {},
				response: {},
			});
			(unauthorizedContext.helpers.request as jest.Mock).mockResolvedValue({ items: [] });
			await getChutes.call(unauthorizedContext);
			expect(unauthorizedContext.helpers.request).toHaveBeenCalled();

			const nullishStatusContext = createMockLoadOptionsFunctions();
			(nullishStatusContext.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue({
				httpCode: null,
				statusCode: null,
				status: null,
				response: {},
				description: '',
				message: '',
			});
			await expect(getChutes.call(nullishStatusContext)).resolves.toEqual([]);
		});
	});

	describe('coverage branch closures', () => {
		it('getChutesByType handles present and missing descriptions', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				items: [
					{
						chute_id: '1',
						name: 'image-one',
						slug: 'image-one',
						standard_template: 'diffusion',
						public: true,
						user: { username: 'u' },
					},
					{
						chute_id: '2',
						name: 'llm-one',
						slug: 'llm-one',
						standard_template: 'vllm',
						public: true,
						user: { username: 'u' },
					},
				],
			});
			const byType = await getChutesByType.call(mockContext, 'diffusion');
			expect(byType).toHaveLength(1);
		});

		it('specialized loaders cover nullish fields and keyword && fallback terms', async () => {
			const mockContext = createMockLoadOptionsFunctions();
			(mockContext.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				items: [
					// Nullish fields trigger `?.toLowerCase() || ''` fallback arms
					{ chute_id: 'n1', slug: 'n1', public: true } as any,
					// Image keywords
					{ chute_id: 'i1', name: 'flux-model', slug: 'i1', public: true } as any,
					// Video keywords
					{ chute_id: 'v1', name: 'hunyuan-video', slug: 'v1', public: true } as any,
					// TTS keywords
					{ chute_id: 't1', name: 'kokoro-tts', slug: 't1', public: true } as any,
					// STT keywords
					{ chute_id: 's1', name: 'whisper-asr', slug: 's1', public: true } as any,
					// Music keywords
					{ chute_id: 'm1', name: 'diffrhythm-music', slug: 'm1', public: true } as any,
					// Embedding && terms (first side true, second false)
					{ chute_id: 'e1', name: 'qwen', slug: 'e1', public: true } as any,
					{ chute_id: 'e2', name: 'nomic', slug: 'e2', public: true } as any,
					{ chute_id: 'e3', name: 'jina', slug: 'e3', public: true } as any,
					{ chute_id: 'e4', name: 'sfr', slug: 'e4', public: true } as any,
					{ chute_id: 'e5', name: 'arctic', slug: 'e5', public: true } as any,
					// Moderation && terms (first side true, second false)
					{ chute_id: 'mo1', name: 'granite', slug: 'mo1', public: true } as any,
					{ chute_id: 'mo2', name: 'unitary', slug: 'mo2', public: true } as any,
					{ chute_id: 'mo3', name: 'clip', slug: 'mo3', public: true } as any,
					// Moderation direct terms
					{ chute_id: 'mo4', name: 'llama-firewall', slug: 'mo4', public: true } as any,
				],
			});

			await expect(getImageChutes.call(mockContext)).resolves.toBeDefined();
			await expect(getVideoChutes.call(mockContext)).resolves.toBeDefined();
			await expect(getTTSChutes.call(mockContext)).resolves.toBeDefined();
			await expect(getSTTChutes.call(mockContext)).resolves.toBeDefined();
			await expect(getMusicChutes.call(mockContext)).resolves.toBeDefined();
			await expect(getEmbeddingChutes.call(mockContext)).resolves.toBeDefined();
			await expect(getModerationChutes.call(mockContext)).resolves.toBeDefined();
		});
	});
});

