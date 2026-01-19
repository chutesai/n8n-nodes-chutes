/**
 * TDD Test: Multi-Image Edit Support
 * 
 * Image edit should support multiple images (1-3) for composition tasks.
 * Models like Qwen-Image-Edit-2511 accept image_b64s array.
 * 
 * This test validates:
 * 1. UI has additionalImages collection in additionalOptions
 * 2. Handler processes multiple images with same three-priority logic as keyframes
 * 3. Request builder maps to image_b64s array
 */

import { imageGenerationOperations } from '../../nodes/Chutes/operations/imageGeneration';

describe('Image Edit - Multi-Image Support', () => {
	describe('UI Structure', () => {
		it('should have additionalImages collection in additionalOptions for edit operation', () => {
			// Find additionalOptions for edit operation
			const additionalOptions = imageGenerationOperations.find(
				(p: any) => p.name === 'additionalOptions'
			) as any;

			expect(additionalOptions).toBeDefined();
			expect(additionalOptions.type).toBe('collection');

			// Find additionalImages within additionalOptions
			const additionalImages = additionalOptions.options.find(
				(opt: any) => opt.name === 'additionalImages'
			);

			// This should FAIL initially - additionalImages doesn't exist yet
			expect(additionalImages).toBeDefined();
			expect(additionalImages.type).toBe('fixedCollection');
			expect(additionalImages.typeOptions?.multipleValues).toBe(true);
		});

		it('should have source field for each additional image', () => {
			const additionalOptions = imageGenerationOperations.find(
				(p: any) => p.name === 'additionalOptions'
			) as any;

			const additionalImages = additionalOptions.options.find(
				(opt: any) => opt.name === 'additionalImages'
			);

			expect(additionalImages).toBeDefined();
			expect(additionalImages.options).toBeDefined();
			expect(additionalImages.options.length).toBeGreaterThan(0);

			const imageOption = additionalImages.options[0];
			expect(imageOption.name).toBe('images');
			expect(imageOption.values).toBeDefined();

			// Check for source field
			const sourceField = imageOption.values.find((v: any) => v.name === 'source');
			expect(sourceField).toBeDefined();
			expect(sourceField.type).toBe('string');
		});

		it('should show additionalImages only for edit operation', () => {
			const additionalOptions = imageGenerationOperations.find(
				(p: any) => p.name === 'additionalOptions'
			) as any;

			const additionalImages = additionalOptions.options.find(
				(opt: any) => opt.name === 'additionalImages'
			);

			expect(additionalImages).toBeDefined();
			
			// Check displayOptions
			if (additionalImages.displayOptions) {
				expect(additionalImages.displayOptions.show).toBeDefined();
				expect(additionalImages.displayOptions.show.operation).toContain('edit');
			}
			// Note: If no displayOptions, it means it's always visible in additionalOptions
			// which is acceptable since additionalOptions itself has display logic
		});
	});

	describe('Handler Logic', () => {
		it('should have multi-image processing in edit handler', () => {
			const fs = require('fs');
			const path = require('path');
			const handlerFilePath = path.join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
			const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');

			// Find the edit operation handler
			const editHandlerMatch = handlerCode.match(/else if \(operation === 'edit'\) \{[\s\S]*?(?=\n\t} \n\t\n\telse if \(operation ===|$)/);
			
			expect(editHandlerMatch).toBeDefined();

			if (editHandlerMatch) {
				const editHandler = editHandlerMatch[0];

				// Should build an array for images
				const hasImageArray = editHandler.includes('imageB64s') || editHandler.includes('const images');
				expect(hasImageArray).toBe(true);

				// Should get additionalImages from additionalOptions
				const hasAdditionalImages = editHandler.includes('additionalImages');
				expect(hasAdditionalImages).toBe(true);

				// Should search ALL input items (like keyframes does)
				const hasAllInputItems = editHandler.includes('this.getInputData()') || 
				                         editHandler.includes('allInputItems');
				expect(hasAllInputItems).toBe(true);

				// Should have getBinaryDataBuffer call
				const hasGetBinaryBuffer = editHandler.includes('getBinaryDataBuffer');
				expect(hasGetBinaryBuffer).toBe(true);
			}
		});

		it('should use same three-priority pattern as keyframes', () => {
			const fs = require('fs');
			const path = require('path');
			const handlerFilePath = path.join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
			const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');

			const editHandlerMatch = handlerCode.match(/else if \(operation === 'edit'\) \{[\s\S]*?(?=\n\t} \n\t\n\telse if \(operation ===|$)/);
			
			expect(editHandlerMatch).toBeDefined();

			if (editHandlerMatch) {
				const editHandler = editHandlerMatch[0];

				// PRIORITY 1: Named binary property search
				const hasPriority1 = editHandler.includes('PRIORITY 1') || 
				                     (editHandler.includes('for (let idx = 0; idx < allInputItems.length') &&
				                      editHandler.includes('itemBinary['));
				expect(hasPriority1).toBe(true);

				// PRIORITY 2: Empty field fallback to binary.data
				const hasPriority2 = editHandler.includes('PRIORITY 2') || 
				                     editHandler.includes('!sourceParam') ||
				                     editHandler.includes('!imageParam');
				expect(hasPriority2).toBe(true);

				// PRIORITY 3: URL/Data URL handling
				const hasPriority3 = editHandler.includes('PRIORITY 3') || 
				                     (editHandler.includes("startsWith('http") && 
				                      editHandler.includes("startsWith('data:"));
				expect(hasPriority3).toBe(true);
			}
		});
	});

	describe('Request Builder', () => {
		it('should map images array to image_b64s for edit operation', () => {
			const fs = require('fs');
			const path = require('path');
			const openApiFilePath = path.join(__dirname, '../../nodes/Chutes/transport/openApiDiscovery.ts');
			const openApiCode = fs.readFileSync(openApiFilePath, 'utf-8');

			// Should handle images array for edit
			const hasImageB64sMapping = openApiCode.includes('image_b64s');
			expect(hasImageB64sMapping).toBe(true);

			// Should check if images is an array (may use userInputs or modifiedInputs)
			const hasArrayCheck = openApiCode.includes('Array.isArray(modifiedInputs.images)') ||
			                      openApiCode.includes('Array.isArray(userInputs.images)') ||
			                      openApiCode.includes('Array.isArray(modifiedInputs.image)') ||
			                      openApiCode.includes('Array.isArray(userInputs.image)');
			expect(hasArrayCheck).toBe(true);
		});

		it('should wrap single image in array for backward compatibility', () => {
			const fs = require('fs');
			const path = require('path');
			const openApiFilePath = path.join(__dirname, '../../nodes/Chutes/transport/openApiDiscovery.ts');
			const openApiCode = fs.readFileSync(openApiFilePath, 'utf-8');

			// Should handle both array and single image
			// Looking for pattern like: userInputs.images ? array : [single]
			const hasArrayWrapping = openApiCode.includes('[userInputs.image]') || 
			                         openApiCode.includes('image_b64s = [');
			expect(hasArrayWrapping).toBe(true);
		});
	});
});
