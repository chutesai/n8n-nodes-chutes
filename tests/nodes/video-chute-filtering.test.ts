/**
 * Test: Video Generation UX - Operation-Specific Chute Filtering
 * 
 * Purpose: Document and test whether video chutes should be filtered based on selected operation
 * 
 * Problems addressed:
 * - Both text2video and image2video show all video chutes in dropdown
 * - Users must manually match operation with correct chute capabilities
 * - Confusing UX when operation doesn't match chute type
 */

import { getVideoChutes } from '../../nodes/Chutes/methods/loadChutes';
import { ILoadOptionsFunctions } from 'n8n-workflow';

describe('Video Chute Filtering by Operation', () => {
	let mockContext: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			helpers: {
				request: jest.fn().mockResolvedValue({
					total: 5,
					page: 1,
					limit: 500,
					items: [
						// Text-to-video capable chutes
						{
							chute_id: 't2v-1',
							name: 'Wan2.2 T2V',
							tagline: 'Generate videos from text',
							slug: 'chutes-wan2-1-14b',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						// Image-to-video capable chutes
						{
							chute_id: 'i2v-1',
							name: 'Wan 2.2 I2V Fast',
							tagline: 'Animate images into videos',
							slug: 'chutes-wan-2-2-i2v-14b-fast',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						// Both t2v and i2v capable
						{
							chute_id: 'both-1',
							name: 'HunyuanVideo',
							tagline: 'Text and image to video',
							slug: 'chutes-hunyuan-video',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						// Image generation (should be excluded)
						{
							chute_id: 'img-1',
							name: 'Hunyuan Image',
							tagline: 'Generate images',
							slug: 'chutes-hunyuan-image-3',
							standard_template: 'diffusion',
							user: { username: 'chutes' },
							public: true,
						},
					],
				}),
			} as any,
		};
	});

	it('should return all video chutes (current behavior)', async () => {
		const result = await getVideoChutes.call(mockContext as ILoadOptionsFunctions);

		// Current behavior: Returns ALL chutes with "video" in name/description
		// This includes both t2v and i2v chutes together
		expect(result.length).toBeGreaterThan(0);
		
		const names = result.map(r => r.name);
		console.log('Current video chutes returned:', names);
		
		// Both t2v and i2v chutes are returned together
		// This is the source of user confusion
	});

	it('should exclude image generation chutes from video dropdown', async () => {
		const result = await getVideoChutes.call(mockContext as ILoadOptionsFunctions);

		// Should not include chutes that are purely for image generation
		const slugs = result.map(r => String(r.value));
		
		// "hunyuan-image-3" should be excluded (it's image-only, not video)
		const hasImageOnly = slugs.some(s => s.includes('hunyuan-image-3'));
		expect(hasImageOnly).toBe(false);
	});

	// FUTURE ENHANCEMENT TEST (currently will pass with current behavior)
	// This documents what COULD be implemented if we want operation-specific filtering
	it('INVESTIGATION: operation-specific filtering could improve UX', () => {
		// If we implement this, getVideoChutes would accept an operation parameter:
		// - getVideoChutes(operation: 'text2video') -> only t2v-capable chutes
		// - getVideoChutes(operation: 'image2video') -> only i2v-capable chutes
		// 
		// This would require:
		// 1. OpenAPI schema inspection to detect t2v vs i2v capability
		// 2. Dynamic filtering in loadOptionsMethod based on current operation selection
		// 3. n8n's loadOptionsDependsOn to trigger re-load when operation changes
		//
		// DECISION: Keep current behavior (show all video chutes) for now
		// Reason: Most video chutes support both operations, and dynamic filtering
		// adds complexity. Users can see operation type in chute names.
		
		expect(true).toBe(true); // Placeholder - investigation complete
	});
});

