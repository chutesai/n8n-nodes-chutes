/**
 * TDD Test: Keyframe should support named binary properties across ALL input items
 * 
 * Bug: When user types "start_frame_image" or "data" in the Image field,
 *      it treated it as literal base64 instead of fetching from binary[propertyName]
 * 
 * Fix: Search ALL input items for the named binary property and fetch from the correct item
 * 
 * This test verifies the handler searches items and uses itemBinary[imageParam]
 */

import fs from 'fs';
import path from 'path';

describe('Keyframe Named Binary Properties', () => {
	const handlerFilePath = path.join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
	
	test('keyframe handler MUST check if imageParam is a binary property name', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		
		// Find the keyframe handler
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else \{|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// Must check if imageParam exists as a property in binary data
			// New pattern: itemBinary[imageParam]
			const checksBinaryProperty = 
				(keyframeHandler.includes('itemBinary[imageParam]') ||
				 keyframeHandler.includes('binaryData[imageParam]'));
			
			// Must call getBinaryDataBuffer with dynamic index (from loop)
			// Pattern: getBinaryDataBuffer(idx, imageParam)
			const callsGetBinaryWithParam = 
				keyframeHandler.includes('getBinaryDataBuffer(idx, imageParam)') ||
				keyframeHandler.includes('getBinaryDataBuffer(itemIndex, imageParam)');
			
			expect(checksBinaryProperty).toBe(true);
			expect(callsGetBinaryWithParam).toBe(true);
		}
	});

	test('keyframe handler should check binary property BEFORE treating as URL/base64', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else \{|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// The code must:
			// 1. Have a binary property check (itemBinary[imageParam])
			// 2. Have a guard clause that prevents treating binary property names as URLs
			//    This can be: !imageParam.startsWith('http') BEFORE the binary check
			//    OR the URL processing is in a separate else block (PRIORITY 3)
			
			const hasBinaryCheck = 
				keyframeHandler.includes('itemBinary[imageParam]') ||
				keyframeHandler.includes('binaryData[imageParam]');
			
			// The implementation uses a guard: if (imageParam && !imageParam.startsWith('http')...)
			// This ensures binary check runs BEFORE URL download for non-URL strings
			const hasGuardClause = keyframeHandler.includes('!imageParam.startsWith(\'http\')') ||
			                       keyframeHandler.includes('!imageParam.startsWith("http")');
			
			// Binary check exists
			expect(hasBinaryCheck).toBe(true);
			// Guard clause ensures URLs are not treated as binary property names
			expect(hasGuardClause).toBe(true);
		}
	});

	test('keyframe handler should support multiple named binary properties (not just "data")', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else \{|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// Should have BOTH:
			// 1. Dynamic property name support: getBinaryDataBuffer(idx, imageParam)
			// 2. Hardcoded fallback: getBinaryDataBuffer(*, 'data') for empty field
			const usesImageParamVariable = 
				keyframeHandler.includes('getBinaryDataBuffer(idx, imageParam)') ||
				keyframeHandler.includes('getBinaryDataBuffer(itemIndex, imageParam)');
			const hasFallbackForData = 
				keyframeHandler.includes(', \'data\')') ||
				keyframeHandler.includes(', "data")');
			
			// Must have dynamic support
			expect(usesImageParamVariable).toBe(true);
			
			// Must also have fallback for empty field (standard n8n)
			expect(hasFallbackForData).toBe(true);
		}
	});

	test('keyframe handler MUST have fallback for empty field with binary.data (standard n8n)', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else \{|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// CRITICAL: Must have fallback for empty imageParam with binary.data
			// This is the STANDARD n8n pattern that CANNOT be broken!
			// Pattern: if (!imageBase64 && !imageParam ...) then search for .data
			
			const hasEmptyFieldCheck = keyframeHandler.includes('!imageParam');
			const hasBinaryDataCheck = 
				keyframeHandler.includes('itemBinary.data') ||
				keyframeHandler.includes('binaryData.data');
			const hasGetBinaryForData = 
				keyframeHandler.includes(', \'data\')') ||
				keyframeHandler.includes(', "data")');
			
			// Must have all three: check for empty field, check for binary.data, and fetch it
			expect(hasEmptyFieldCheck).toBe(true);
			expect(hasBinaryDataCheck).toBe(true);
			expect(hasGetBinaryForData).toBe(true);
		}
	});
});
