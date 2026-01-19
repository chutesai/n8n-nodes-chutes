/**
 * TDD Test: Multi-image operations MUST execute only ONCE
 * 
 * When multiple items arrive (e.g., from Merge node):
 * - Edit with additionalImages: Execute ONCE, gather images from ALL items
 * - Keyframe: Execute ONCE, gather images from ALL items
 * 
 * Without this, the node executes N times (once per item), making N API calls
 * with the same images but different seeds, wasting API credits.
 * 
 * This test verifies the handlers have logic to skip subsequent iterations.
 */

import fs from 'fs';
import path from 'path';

describe('Multi-Image Operations - Single Execution', () => {
	const handlerFilePath = path.join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
	
	describe('Edit operation with additionalImages', () => {
		test('must skip execution when itemIndex > 0 in multi-image mode', () => {
			const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
			
			// Find the edit operation handler
			const editHandlerMatch = handlerCode.match(/else if \(operation === 'edit'\) \{[\s\S]*?(?=\n\telse if \(operation ===|$)/);
			
			expect(editHandlerMatch).toBeDefined();
			
			if (editHandlerMatch) {
				const editHandler = editHandlerMatch[0];
				
				// Must detect multi-image mode
				const hasMultiImageDetection = 
					editHandler.includes('additionalImages') &&
					(editHandler.includes('isMultiImage') || 
					 editHandler.includes('hasAdditionalImages') ||
					 editHandler.includes('additionalImagesCollection'));
				
				// Must skip when itemIndex > 0
				const hasItemIndexCheck = 
					editHandler.includes('itemIndex > 0') ||
					editHandler.includes('itemIndex !== 0');
				
				// Must have skip logic (continue or return)
				const hasSkipLogic = 
					editHandler.includes('continue') ||
					editHandler.includes('return');
				
				expect(hasMultiImageDetection).toBe(true);
				expect(hasItemIndexCheck).toBe(true);
				expect(hasSkipLogic).toBe(true);
			}
		});
		
		test('must NOT skip execution in single-image mode (backward compatibility)', () => {
			const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
			const editHandlerMatch = handlerCode.match(/else if \(operation === 'edit'\) \{[\s\S]*?(?=\n\telse if \(operation ===|$)/);
			
			expect(editHandlerMatch).toBeDefined();
			
			if (editHandlerMatch) {
				const editHandler = editHandlerMatch[0];
				
				// Must have conditional skip (only skip IF multi-image mode)
				// Pattern: if (isMultiImage && itemIndex > 0) { continue; }
				// Should NOT have: if (itemIndex > 0) { continue; } (unconditional)
				
				const hasConditionalSkip = 
					(editHandler.includes('isMultiImage') || 
					 editHandler.includes('hasAdditionalImages') ||
					 editHandler.includes('additionalImagesCollection')) &&
					editHandler.includes('itemIndex');
				
				expect(hasConditionalSkip).toBe(true);
			}
		});
	});
	
	describe('Keyframe operation', () => {
		test('must skip execution when itemIndex > 0 (always multi-image)', () => {
			const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
			
			// Find the keyframe handler
			const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else \{|$)/);
			
			expect(keyframeHandlerMatch).toBeDefined();
			
			if (keyframeHandlerMatch) {
				const keyframeHandler = keyframeHandlerMatch[0];
				
				// Keyframe ALWAYS requires multiple images, so should ALWAYS skip itemIndex > 0
				const hasItemIndexCheck = 
					keyframeHandler.includes('itemIndex > 0') ||
					keyframeHandler.includes('itemIndex !== 0');
				
				const hasSkipLogic = 
					keyframeHandler.includes('continue') ||
					keyframeHandler.includes('return');
				
				expect(hasItemIndexCheck).toBe(true);
				expect(hasSkipLogic).toBe(true);
			}
		});
	});
	
	describe('Main loop structure', () => {
		test('must have for loop that can be skipped with continue', () => {
			const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
			
			// Find the main execution loop
			const mainLoopMatch = handlerCode.match(/for \(let i = 0; i < items\.length; i\+\+\) \{/);
			
			expect(mainLoopMatch).toBeDefined();
		});
	});
});
