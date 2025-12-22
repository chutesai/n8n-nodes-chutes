/**
 * Test: Image Chutes Smart Sorting
 * 
 * Verifies that image chutes are sorted intelligently based on the selected operation:
 * - When operation is "edit": chutes with edit-related keywords appear first
 * - When operation is "generate": default order is maintained
 * 
 * This enhances UX without filtering out any chutes.
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data
const mockImageChutes = [
	{
		chute_id: '1',
		name: 'Stable Diffusion XL',
		slug: 'stable-diffusion-xl',
		standard_template: 'diffusion',
		public: true,
		tagline: 'High-quality image generation',
	},
	{
		chute_id: '2',
		name: 'DALL-E Image Editor',
		slug: 'dalle-image-editor',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Edit and transform images',
	},
	{
		chute_id: '3',
		name: 'Flux Inpainting',
		slug: 'flux-inpainting',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Advanced inpainting capabilities',
	},
	{
		chute_id: '4',
		name: 'JuggernautXL',
		slug: 'juggernautxl',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Photorealistic generation',
	},
	{
		chute_id: '5',
		name: 'Image Outpainting Tool',
		slug: 'image-outpainting',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Expand your images',
	},
];

describe('Image Chutes Smart Sorting', () => {
	let mockContext: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		// Reset mock context
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-key' }),
			helpers: {
				request: jest.fn().mockResolvedValue({
					total: mockImageChutes.length,
					items: mockImageChutes,
				}),
			} as any,
			getCurrentNodeParameter: jest.fn(),
		};
	});

	test('should sort edit-capable chutes to the top when operation is "edit"', async () => {
		// Mock operation parameter as "edit"
		(mockContext.getCurrentNodeParameter as jest.Mock).mockReturnValue('edit');

		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Check that edit-related chutes are at the top
		expect(result.length).toBe(5);
		
		// First three should contain edit-related keywords
		const topThree = result.slice(0, 3);
		topThree.forEach(option => {
			const name = option.name.toLowerCase();
			const hasEditKeyword = 
				name.includes('edit') ||
				name.includes('inpaint') ||
				name.includes('outpaint') ||
				name.includes('img2img');
			
			expect(hasEditKeyword).toBe(true);
		});

		// Verify specific order: edit-capable chutes first
		expect(result[0].name).toContain('Editor'); // DALL-E Image Editor
		expect(result[1].name).toContain('Inpainting'); // Flux Inpainting
		expect(result[2].name).toContain('Outpainting'); // Image Outpainting Tool
	});

	test('should maintain default order when operation is "generate"', async () => {
		// Mock operation parameter as "generate"
		(mockContext.getCurrentNodeParameter as jest.Mock).mockReturnValue('generate');

		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Should return all chutes in their original order
		expect(result.length).toBe(5);
		expect(result[0].name).toBe('Stable Diffusion XL - High-quality image generation...');
	});

	test('should maintain default order when operation is not set', async () => {
		// Mock getCurrentNodeParameter to throw (field not yet set)
		(mockContext.getCurrentNodeParameter as jest.Mock).mockImplementation(() => {
			throw new Error('Parameter not set');
		});

		const result = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Should return all chutes without error
		expect(result.length).toBe(5);
	});

	test('should include all chutes regardless of operation', async () => {
		// Test with "edit" operation
		(mockContext.getCurrentNodeParameter as jest.Mock).mockReturnValue('edit');
		const editResult = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Test with "generate" operation
		(mockContext.getCurrentNodeParameter as jest.Mock).mockReturnValue('generate');
		const generateResult = await loadChutes.getImageChutes.call(mockContext as ILoadOptionsFunctions);

		// Both should include all chutes (no filtering)
		expect(editResult.length).toBe(5);
		expect(generateResult.length).toBe(5);
	});
});

