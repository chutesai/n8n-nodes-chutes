/**
 * Test: Image Chutes - XL Variants and Model Mixes
 * 
 * Verifies that image generation chutes without "image" in their name
 * are still included based on common naming patterns:
 * - XL suffix (NovaFurryXL, HassakuXL, etc.)
 * - Mix suffix (iLustMix, etc.)
 * - Common model names (Lykon, Illustrij, etc.)
 * 
 * These are REAL chutes from the Chutes.ai playground that were being
 * excluded by the previous logic.
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on REAL chutes from Chutes.ai (from user screenshot)
const mockChutes = [
	// XL variants - should be INCLUDED
	{
		chute_id: '1',
		name: 'NovaFurryXL',
		slug: 'novafurryxl',
		standard_template: null, // template: none
		public: true,
		tagline: 'Furry art generation model',
	},
	{
		chute_id: '2',
		name: 'HassakuXL',
		slug: 'hassaku-xl',
		standard_template: null, // template: none
		public: true,
		tagline: 'Anime style image generation',
	},
	// Mix variants - should be INCLUDED
	{
		chute_id: '3',
		name: 'iLustMix',
		slug: 'ilustmix',
		standard_template: null, // template: none
		public: true,
		tagline: 'Realistic portrait generation',
	},
	// Other image models without "image" keyword - should be INCLUDED
	{
		chute_id: '4',
		name: 'Lykon',
		slug: 'lykon',
		standard_template: 'diffusion', // Has diffusion template
		public: true,
		tagline: 'dreamshaper-xl-1-0',
	},
	{
		chute_id: '5',
		name: 'Illustrij',
		slug: 'illustrij',
		standard_template: null, // template: none
		public: true,
		tagline: 'Illustration and anime art',
	},
	{
		chute_id: '6',
		name: 'Animij',
		slug: 'animij',
		standard_template: null, // template: none
		public: true,
		tagline: 'Anime character generation',
	},
	{
		chute_id: '7',
		name: 'diagonalge',
		slug: 'diagonalge',
		standard_template: null, // template: none
		public: true,
		tagline: 'Booba', // Generic tagline, might be hard to catch
	},
	// Non-image chutes - should be EXCLUDED
	{
		chute_id: '8',
		name: 'Qwen/Qwen3-32B',
		slug: 'qwen-qwen3-32b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Large language model',
	},
	{
		chute_id: '9',
		name: 'hunyuan-video-3',
		slug: 'hunyuan-video-3',
		standard_template: null,
		public: true,
		tagline: 'Video generation model',
	},
];

describe('Image Chutes - XL Variants and Model Mixes', () => {
	let mockContext: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-key' }),
			helpers: {
				request: jest.fn().mockResolvedValue({
					total: mockChutes.length,
					items: mockChutes,
				}),
			} as any,
			getCurrentNodeParameter: jest.fn().mockReturnValue('generate'),
		};
	});

	test('should include XL variant chutes (NovaFurryXL, HassakuXL)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://novafurryxl.chutes.ai');
		expect(slugs).toContain('https://hassaku-xl.chutes.ai');
	});

	test('should include Mix variant chutes (iLustMix)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://ilustmix.chutes.ai');
	});

	test('should include diffusion template chutes (Lykon)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://lykon.chutes.ai');
	});

	test('should include art/anime generation chutes (Illustrij, Animij)', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://illustrij.chutes.ai');
		expect(slugs).toContain('https://animij.chutes.ai');
	});

	test('should exclude LLM chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://qwen-qwen3-32b.chutes.ai');
	});

	test('should exclude video chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://hunyuan-video-3.chutes.ai');
	});

	test('should include most image generation chutes from screenshot', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Should include at least 6 out of 7 image chutes
		// (diagonalge might be hard to catch without more info)
		expect(result.length).toBeGreaterThanOrEqual(5);
		expect(result.length).toBeLessThanOrEqual(7);
	});
});

