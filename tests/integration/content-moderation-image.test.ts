/**
 * Test: Content Moderation Image Input
 * 
 * Purpose: Verify that content moderation can accept image inputs
 * for NSFW classification and other image-based moderation
 * 
 * Problems addressed:
 * - NSFW classifier needs image input, only has text (problems.txt line 14)
 */

describe('Content Moderation Image Input', () => {
	it('should have image input field for content moderation', () => {
		const { contentModerationOperations } = require('../../nodes/Chutes/operations/contentModeration');
		
		// Find the image input field
		const imageField = contentModerationOperations.find((field: any) => 
			field.name === 'image' && field.displayOptions?.show?.resource?.includes('contentModeration')
		);
		
		expect(imageField).toBeDefined();
		expect(imageField?.displayName).toBe('Image');
		expect(imageField?.type).toBe('string');
		expect(imageField?.description.toLowerCase()).toContain('image');
	});

	it('should allow either content (text) OR image input', () => {
		const { contentModerationOperations } = require('../../nodes/Chutes/operations/contentModeration');
		
		// Find content field
		const contentField = contentModerationOperations.find((field: any) => 
			field.name === 'content'
		);
		
		// Find image field
		const imageField = contentModerationOperations.find((field: any) => 
			field.name === 'image'
		);
		
		// Both should exist
		expect(contentField).toBeDefined();
		expect(imageField).toBeDefined();
		
		// At least one should be provided (not both required)
		// This is a UX design choice - we'll make content not required if image is provided
		expect(contentField?.required).toBe(false);
		expect(imageField?.required).toBe(false);
	});

	it('should support URL, base64, and binary image inputs', () => {
		const { contentModerationOperations } = require('../../nodes/Chutes/operations/contentModeration');
		
		const imageField = contentModerationOperations.find((field: any) => 
			field.name === 'image'
		);
		
		expect(imageField).toBeDefined();
		expect(imageField?.description || imageField?.hint || imageField?.placeholder).toMatch(/URL|base64|binary/i);
	});
});
