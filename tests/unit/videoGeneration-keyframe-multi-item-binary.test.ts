/**
 * TDD Test: Keyframe handler MUST search ALL input items for binary data
 * 
 * When a Merge node produces multiple items with different binary properties:
 * - Item 0: binary.start_frame_image
 * - Item 1: binary.data
 * 
 * The keyframe handler must be able to find binary data across ALL items,
 * not just the current itemIndex.
 * 
 * This test verifies the HANDLER CODE searches all input items.
 */

import fs from 'fs';
import path from 'path';

describe('Keyframe Handler - Multi-Item Binary Search', () => {
	const handlerFilePath = path.join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
	
	test('Keyframe handler MUST search ALL input items for binary property', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		
		// Find the keyframe handler section
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else \{|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// CRITICAL: Must iterate over ALL input items to find binary data
			// Look for: this.getInputData() being iterated (not just [itemIndex])
			// OR: for loop over inputData / allItems
			// OR: .find() or .some() on input items
			const hasInputDataIteration = 
				keyframeHandler.includes('getInputData()') && (
					keyframeHandler.includes('for (') ||
					keyframeHandler.includes('.find(') ||
					keyframeHandler.includes('.some(') ||
					keyframeHandler.includes('.forEach(') ||
					keyframeHandler.includes('for (const') ||
					keyframeHandler.includes('for (let')
				);
			
			// Alternative: Check if it's searching through allInputItems or similar
			const hasAllItemsSearch = 
				keyframeHandler.includes('allInputItems') ||
				keyframeHandler.includes('inputItems') ||
				keyframeHandler.includes('allItems');
			
			// The handler MUST have logic to search across items
			expect(hasInputDataIteration || hasAllItemsSearch).toBe(true);
		}
	});

	test('Keyframe handler must find binary from different items by property name', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else \{|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// Must have logic to:
			// 1. Check if imageParam matches a binary property name
			// 2. Search through input items for that property
			// 3. Get the binary buffer from the correct item
			
			// Look for pattern like: itemBinary[imageParam] or item.binary[propertyName]
			const hasDynamicPropertyLookup = 
				keyframeHandler.includes('itemBinary[') ||
				keyframeHandler.includes('.binary[') ||
				keyframeHandler.includes('binary[imageParam]');
			
			// Must also have getBinaryDataBuffer call with dynamic item index
			// Pattern: getBinaryDataBuffer(foundItemIndex, ...) or getBinaryDataBuffer(i, ...)
			const hasDynamicItemIndex = 
				keyframeHandler.includes('getBinaryDataBuffer(foundIndex') ||
				keyframeHandler.includes('getBinaryDataBuffer(itemIdx') ||
				keyframeHandler.includes('getBinaryDataBuffer(i,') ||
				keyframeHandler.includes('getBinaryDataBuffer(idx');
			
			expect(hasDynamicPropertyLookup).toBe(true);
			expect(hasDynamicItemIndex).toBe(true);
		}
	});

	test('Keyframe handler must NOT just use itemIndex for binary lookup', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else \{|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// Count how many times getBinaryDataBuffer is called
			const binaryBufferCalls = (keyframeHandler.match(/getBinaryDataBuffer\(/g) || []).length;
			
			// If there are getBinaryDataBuffer calls, at least one should NOT use just itemIndex
			// i.e., should use a variable like foundIndex, i, idx, etc.
			if (binaryBufferCalls > 0) {
				const hasOnlyItemIndexCalls = 
					!keyframeHandler.includes('getBinaryDataBuffer(foundIndex') &&
					!keyframeHandler.includes('getBinaryDataBuffer(itemIdx') &&
					!keyframeHandler.includes('getBinaryDataBuffer(i,') &&
					!keyframeHandler.includes('getBinaryDataBuffer(idx') &&
					keyframeHandler.includes('getBinaryDataBuffer(itemIndex');
				
				// This should be FALSE - we need dynamic item index lookups
				expect(hasOnlyItemIndexCalls).toBe(false);
			}
		}
	});
});
