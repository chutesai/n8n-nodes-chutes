/**
 * Test: Image Dropdown Filtering
 * 
 * Purpose: Verify that getImageChutes() only returns image generation models
 * and excludes video/moderation chutes.
 * 
 * Problems addressed (from problems.txt line 9-11):
 * - Wan2.2-Fast (video model) showing up in image gen resource
 * - Both video gen models showing up
 * - NSFW classifier (moderation) showing up
 */

import { getImageChutes } from '../../nodes/Chutes/methods/loadChutes';
import { ILoadOptionsFunctions } from 'n8n-workflow';

describe('Image Dropdown Filtering', () => {
	let mockContext: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		// Mock the n8n context
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			getCurrentNodeParameter: jest.fn().mockReturnValue('generate'),
			helpers: {
				request: jest.fn().mockResolvedValue({
					total: 10,
					page: 1,
					limit: 500,
					items: [
						// Valid image generation chutes
						{
							chute_id: 'image-1',
							name: 'Flux Image Generator',
							tagline: 'Generate images from text',
							slug: 'chutes-flux-1-dev',
							standard_template: 'diffusion',
							user: { username: 'chutes' },
							public: true,
						},
						{
							chute_id: 'image-2',
							name: 'SDXL Image Model',
							tagline: 'Stable Diffusion XL for image generation',
							slug: 'chutes-sdxl-turbo',
							standard_template: 'diffusion',
							user: { username: 'chutes' },
							public: true,
						},
						{
							chute_id: 'image-3',
							name: 'Qwen Image',
							tagline: 'Qwen image generation model',
							slug: 'chutes-qwen-image',
							standard_template: 'diffusion',
							user: { username: 'chutes' },
							public: true,
						},
						// Image chute with template: none but image in name (REGRESSION TEST)
						{
							chute_id: 'image-4',
							name: 'qwen-image-edit-2509',
							tagline: 'Advanced image editing',
							slug: 'qwen-image-edit-2509',
							standard_template: null, // template: none
							user: { username: 'chutes' },
							public: true,
						},
						{
							chute_id: 'image-5',
							name: 'z-image-turbo',
							tagline: 'Fast image generation',
							slug: 'z-image-turbo',
							standard_template: null, // template: none
							user: { username: 'chutes' },
							public: true,
						},
						// Video chutes that should be excluded
						{
							chute_id: 'video-1',
							name: 'Wan2.2 Video Generator',
							tagline: 'Generate videos from text',
							slug: 'chutes-wan2-1-14b',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						{
							chute_id: 'video-2',
							name: 'Wan-2.2-I2V-14B-Fast',
							tagline: 'Convert images to video fast',
							slug: 'chutes-wan-2-2-i2v-14b-fast',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						// Moderation chutes that should be excluded
						{
							chute_id: 'moderation-1',
							name: 'NSFW Classifier',
							tagline: 'Content moderation and safety',
							slug: 'chutes-nsfw-classifier',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						// LLM chutes that should be excluded
						{
							chute_id: 'llm-1',
							name: 'DeepSeek V3',
							tagline: 'Advanced language model',
							slug: 'chutes-deepseek-ai-deepseek-v3-2',
							standard_template: 'vllm',
							user: { username: 'chutes' },
							public: true,
						},
						// Private/user chutes that should be excluded
						{
							chute_id: 'private-1',
							name: 'User Image Model',
							tagline: 'Custom image generation',
							slug: 'user-custom-image',
							standard_template: 'diffusion',
							user: { username: 'someuser' },
							public: false,
						},
					],
				}),
			} as any,
		};
	});

	it('should return public image generation chutes with diffusion template OR image keywords', async () => {
		const result = await getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Should return 5 valid PUBLIC image chutes (3 diffusion + 2 with template: none but "image" in name)
		expect(result).toHaveLength(5);

		// Verify the returned chutes are the correct ones
		const slugs = result.map(r => r.value);
		expect(slugs).toContain('https://chutes-flux-1-dev.chutes.ai');
		expect(slugs).toContain('https://chutes-sdxl-turbo.chutes.ai');
		expect(slugs).toContain('https://chutes-qwen-image.chutes.ai');
		// REGRESSION FIX: Include chutes with template: none but "image" in name
		expect(slugs).toContain('https://qwen-image-edit-2509.chutes.ai');
		expect(slugs).toContain('https://z-image-turbo.chutes.ai');
	});

	it('should exclude video generation chutes (different template)', async () => {
		const result = await getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Video chutes have custom/none template, not diffusion
		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://chutes-wan2-1-14b.chutes.ai');
		expect(slugs).not.toContain('https://chutes-wan-2-2-i2v-14b-fast.chutes.ai');
	});

	it('should exclude NSFW classifier and moderation chutes (different template)', async () => {
		const result = await getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Moderation chutes have custom/none template, not diffusion
		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://chutes-nsfw-classifier.chutes.ai');
	});

	it('should exclude LLM chutes (vllm template)', async () => {
		const result = await getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// LLM chutes have vllm template, not diffusion
		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://chutes-deepseek-ai-deepseek-v3-2.chutes.ai');
	});

	it('should only include public chutes', async () => {
		const result = await getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Should not include private chutes
		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://user-custom-image.chutes.ai');
		
		// All returned chutes are public diffusion models
		expect(result.length).toBeGreaterThan(0);
	});
});
