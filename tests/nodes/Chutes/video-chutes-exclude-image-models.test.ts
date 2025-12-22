/**
 * REGRESSION TEST: Video Chutes Should Exclude Image-Only Models
 * 
 * Issue: "hunyuan-image-3" was appearing in Video Generation dropdown
 * because "hunyuan" is a valid video model keyword (HunyuanVideo).
 * 
 * Fix: Exclude models with "image" in the name unless they also have
 * video-specific keywords (e.g., "i2v", "video").
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data representing real chutes from Chutes.ai API
const mockChutes = [
	// ✅ Valid video models with "hunyuan" keyword
	{
		chute_id: 'video1',
		name: 'hunyuanvideo-turbo',
		slug: 'hunyuanvideo-turbo',
		standard_template: null,
		public: true,
		tagline: 'HunyuanVideo Turbo',
		description: 'Text-to-video generation by Tencent',
	},
	{
		chute_id: 'video2',
		name: 'hunyuan-i2v',
		slug: 'hunyuan-i2v',
		standard_template: null,
		public: true,
		tagline: 'Image to video',
		description: 'Hunyuan image-to-video model',
	},
	
	// ❌ Image-only model with "hunyuan" keyword (should be EXCLUDED)
	// BUG: This has template: null, so it bypasses the diffusion-only check!
	{
		chute_id: 'image1',
		name: 'hunyuan-image-3',
		slug: 'hunyuan-image-3',
		standard_template: null, // ⚠️ NOT diffusion - will bypass line 292-294 check!
		public: true,
		tagline: 'Image generation',
		description: 'Tencent Hunyuan image generation model',
	},
	
	// ❌ Other image-only models (should be EXCLUDED)
	{
		chute_id: 'image2',
		name: 'stable-diffusion-xl',
		slug: 'stable-diffusion-xl',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Image generation',
		description: 'High-quality image synthesis',
	},
	{
		chute_id: 'image3',
		name: 'flux-schnell-image',
		slug: 'flux-schnell-image',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Fast image generation',
		description: 'FLUX schnell for images',
	},
	
	// ✅ Valid video model with "stable" keyword (SVD)
	{
		chute_id: 'video3',
		name: 'stable-video-diffusion-xt',
		slug: 'stable-video-diffusion-xt',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Image to video',
		description: 'Stability AI video generation',
	},
];

describe('Video Chutes - Exclude Image-Only Models', () => {
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
		};
	});
	
	test('should INCLUDE HunyuanVideo models (video-specific)', async () => {
		const result = await loadChutes.getVideoChutes.call(mockContext as ILoadOptionsFunctions);
		const slugs = result.map((r: any) => r.value);
		
		// ✅ Video-specific Hunyuan models should be included
		expect(slugs).toContain('https://hunyuanvideo-turbo.chutes.ai');
		expect(slugs).toContain('https://hunyuan-i2v.chutes.ai');
	});
	
	test('should EXCLUDE hunyuan-image-3 (image-only model)', async () => {
		const result = await loadChutes.getVideoChutes.call(mockContext as ILoadOptionsFunctions);
		const slugs = result.map((r: any) => r.value);
		
		// ❌ Image-only model should NOT appear in video dropdown
		expect(slugs).not.toContain('https://hunyuan-image-3.chutes.ai');
	});
	
	test('should EXCLUDE other image-only models', async () => {
		const result = await loadChutes.getVideoChutes.call(mockContext as ILoadOptionsFunctions);
		const slugs = result.map((r: any) => r.value);
		
		// ❌ No image-only models should appear
		expect(slugs).not.toContain('https://stable-diffusion-xl.chutes.ai');
		expect(slugs).not.toContain('https://flux-schnell-image.chutes.ai');
	});
	
	test('should INCLUDE stable-video-diffusion (video model with "stable" keyword)', async () => {
		const result = await loadChutes.getVideoChutes.call(mockContext as ILoadOptionsFunctions);
		const slugs = result.map((r: any) => r.value);
		
		// ✅ "stable" is a valid keyword, but only for VIDEO models
		expect(slugs).toContain('https://stable-video-diffusion-xt.chutes.ai');
	});
	
	test('should return only 3 video models (not 6)', async () => {
		const result = await loadChutes.getVideoChutes.call(mockContext as ILoadOptionsFunctions);
		
		// Only 3 video models, not 6 (3 image models should be excluded)
		expect(result.length).toBe(3);
	});
});

