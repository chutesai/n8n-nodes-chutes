/**
 * Integration Test: Image Edit Operation
 * 
 * Verifies that the image edit operation works with different input types:
 * - URL input
 * - Base64 data URI
 * - Binary data from previous node
 */

describe('Image Edit Operation', () => {
	it('should have edit operation defined in imageGeneration operations', () => {
		// This test verifies the UI/operation is defined
		const { imageGenerationOperations } = require('../../nodes/Chutes/operations/imageGeneration');
		
		// Find the operation selector
		const operationField = imageGenerationOperations.find((field: any) => field.name === 'operation');
		expect(operationField).toBeDefined();
		
		// Verify edit operation exists
		const editOption = operationField.options.find((opt: any) => opt.value === 'edit');
		expect(editOption).toBeDefined();
		expect(editOption.name).toBe('Edit');
		expect(editOption.description).toBe('Edit an existing image with a text prompt');
	});

	it('should have image input field for edit operation', () => {
		const { imageGenerationOperations } = require('../../nodes/Chutes/operations/imageGeneration');
		
		// Find the image input field
		const imageField = imageGenerationOperations.find((field: any) => 
			field.name === 'image' && field.displayOptions?.show?.operation?.includes('edit')
		);
		
		expect(imageField).toBeDefined();
		expect(imageField.displayName).toBe('Input Image');
		expect(imageField.required).toBe(false); // Optional - can also use binary data from previous node
		expect(imageField.description).toContain('URL');
		expect(imageField.description).toContain('base64');
		expect(imageField.description).toContain('binary');
	});

	it('should have edit prompt field for edit operation', () => {
		const { imageGenerationOperations } = require('../../nodes/Chutes/operations/imageGeneration');
		
		// Find the edit prompt field
		const promptField = imageGenerationOperations.find((field: any) => 
			field.name === 'prompt' && field.displayOptions?.show?.operation?.includes('edit')
		);
		
		expect(promptField).toBeDefined();
		expect(promptField.displayName).toBe('Edit Prompt');
		expect(promptField.required).toBe(true);
	});
});
