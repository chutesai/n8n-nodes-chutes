/**
 * Test: Image Chutes with template: none
 * 
 * REGRESSION TEST: Verifies that image chutes with template: none are included.
 * 
 * The bug: getImageChutes() only returned chutes with template === 'diffusion',
 * but many valid image chutes like qwen-image-edit-2509 and z-image-turbo 
 * have template: none.
 * 
 * The fix: Use the same permissive filtering logic as global-warmup.ts that
 * includes chutes based on name/tagline keywords, not just template.
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data representing real chutes from Chutes.ai API
const mockChutes = [
	// Image chutes with template: diffusion
	{
		chute_id: '1',
		name: 'JuggernautXL',
		slug: 'juggernautxl',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Photorealistic image generation',
	},
	// Image chutes with template: none but image keywords in name
	{
		chute_id: '2',
		name: 'qwen-image-edit-2509',
		slug: 'qwen-image-edit-2509',
		standard_template: null, // template: none in API
		public: true,
		tagline: 'Advanced image editing',
	},
	{
		chute_id: '3',
		name: 'z-image-turbo',
		slug: 'z-image-turbo',
		standard_template: null, // template: none in API
		public: true,
		tagline: 'Fast image generation',
	},
	{
		chute_id: '4',
		name: 'FLUX.1-schnell',
		slug: 'flux-1-schnell',
		standard_template: null, // template: none in API
		public: true,
		tagline: 'Ultra-fast diffusion model',
	},
	// LLM chute - should be EXCLUDED
	{
		chute_id: '5',
		name: 'Qwen/Qwen3-32B',
		slug: 'qwen-qwen3-32b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Large language model',
	},
	// Video chute - should be EXCLUDED
	{
		chute_id: '6',
		name: 'Wan-2.2-I2V-14B-Fast',
		slug: 'wan-2-2-i2v-14b-fast',
		standard_template: null,
		public: true,
		tagline: 'Image to video generation',
	},
	// Embedding chute - should be EXCLUDED
	{
		chute_id: '7',
		name: 'Qwen/Qwen3-Embedding-8B',
		slug: 'qwen-qwen3-embedding-8b',
		standard_template: 'tei',
		public: true,
		tagline: 'Text embeddings',
	},
];

describe('Image Chutes - template: none Regression', () => {
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

	test('should include image chutes with template: none', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Should include chutes with template: none that have image keywords
		const chuteNames = result.map(c => c.value);
		
		expect(chuteNames).toContain('https://qwen-image-edit-2509.chutes.ai');
		expect(chuteNames).toContain('https://z-image-turbo.chutes.ai');
		expect(chuteNames).toContain('https://flux-1-schnell.chutes.ai');
	});

	test('should include diffusion template chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const chuteNames = result.map(c => c.value);
		expect(chuteNames).toContain('https://juggernautxl.chutes.ai');
	});

	test('should exclude LLM chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const chuteNames = result.map(c => c.value);
		expect(chuteNames).not.toContain('https://qwen-qwen3-32b.chutes.ai');
	});

	test('should exclude video chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const chuteNames = result.map(c => c.value);
		expect(chuteNames).not.toContain('https://wan-2-2-i2v-14b-fast.chutes.ai');
	});

	test('should exclude embedding chutes', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		const chuteNames = result.map(c => c.value);
		expect(chuteNames).not.toContain('https://qwen-qwen3-embedding-8b.chutes.ai');
	});

	test('should return correct total count', async () => {
		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Should include: JuggernautXL, qwen-image-edit-2509, z-image-turbo, FLUX.1-schnell = 4 chutes
		// Should exclude: Qwen LLM, Wan video, Qwen embedding = 3 chutes
		expect(result.length).toBe(4);
	});
});

