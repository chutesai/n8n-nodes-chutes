/**
 * Test: Keyframe should support binary data input
 * 
 * Bug: Keyframe only supports URLs and base64 strings, not binary data from previous nodes.
 * Fix: Add binary data handling like I2V has.
 * 
 * This test verifies that keyframe handler code has the logic to check for binary data.
 * Since this is a handler test, we're checking the code structure rather than execution.
 */

import fs from 'fs';
import path from 'path';

describe('Keyframe Binary Data Support', () => {
	const handlerFilePath = path.join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
	
	it('should have binary data handling in keyframe handler', () => {
		// Read the handler file
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		
		// Find the keyframe operation handler
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=} else if|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// Should check for binary data like I2V does
			// Look for: this.getInputData()[itemIndex].binary
			const hasBinaryCheck = keyframeHandler.includes('this.getInputData()') && 
			                       keyframeHandler.includes('.binary');
			
			// Should call getBinaryDataBuffer like I2V does
			const hasGetBinaryBuffer = keyframeHandler.includes('getBinaryDataBuffer');
			
			expect(hasBinaryCheck).toBe(true);
			expect(hasGetBinaryBuffer).toBe(true);
		}
	});

	it('should use the same binary data pattern as I2V handler', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		
		// Find I2V handler
		const i2vHandlerMatch = handlerCode.match(/} else if \(operation === 'image2video'\) \{[\s\S]*?(?=} else if|$)/);
		
		// Find keyframe handler  
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=} else if|$)/);
		
		expect(i2vHandlerMatch).toBeDefined();
		expect(keyframeHandlerMatch).toBeDefined();
		
		if (i2vHandlerMatch && keyframeHandlerMatch) {
			const i2vHandler = i2vHandlerMatch[0];
			const keyframeHandler = keyframeHandlerMatch[0];
			
			// Both should use getBinaryDataBuffer
			const i2vHasBinary = i2vHandler.includes('getBinaryDataBuffer');
			const keyframeHasBinary = keyframeHandler.includes('getBinaryDataBuffer');
			
			expect(i2vHasBinary).toBe(true);
			expect(keyframeHasBinary).toBe(true); // This should FAIL until we implement it
		}
	});
});
