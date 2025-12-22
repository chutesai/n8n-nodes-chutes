/**
 * Tests for loadChutes methods
 */

import { getChutes, getChutesByType, getLLMChutes, getImageChutes, getChuteUrl } from '../../../../nodes/Chutes/methods/loadChutes';
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
			
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({
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
		
		(mockContext.helpers.request as jest.Mock).mockRejectedValue(new Error('API Error'));

		const options = await getChutes.call(mockContext);

		// Now returns empty array instead of hardcoded fallbacks (programmatic approach)
		expect(options).toHaveLength(0);
	});

		it('should truncate long taglines', async () => {
			const longTagline = 'A'.repeat(150);
			const mockContext = createMockLoadOptionsFunctions();
			
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({
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
			
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({
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
			
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({
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
			
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({
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
			
			(mockContext.helpers.request as jest.Mock).mockResolvedValue({
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
});

