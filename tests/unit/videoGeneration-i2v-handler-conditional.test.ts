/**
 * TDD Test: I2V Handler MUST have conditional logic for model compatibility
 * 
 * The I2V handler in Chutes.node.ts MUST check the chute URL and use:
 * - LTX-2: userInputs.images = [{ image_b64, frame_index, strength }]
 * - Wan-2.2: userInputs.image = imageBase64
 * 
 * This test verifies the HANDLER CODE has the conditional logic.
 */

import fs from 'fs';
import path from 'path';

describe('I2V Handler - Conditional Model Logic', () => {
	const handlerFilePath = path.join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
	
	test('I2V handler MUST have conditional check for LTX-2 vs Wan-2.2', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		
		// Find the I2V handler section
		const i2vHandlerMatch = handlerCode.match(/} else if \(operation === 'image2video'\) \{[\s\S]*?(?=\n\t} else if \(operation ===|$)/);
		
		expect(i2vHandlerMatch).toBeDefined();
		
		if (i2vHandlerMatch) {
			const i2vHandler = i2vHandlerMatch[0];
			
			// CRITICAL: Must have conditional logic based on chute URL
			// Look for: if (chuteUrl.toLowerCase().includes('ltx'))
			// OR: const isLTX2 = chuteUrl && chuteUrl.toLowerCase().includes('ltx')
			const hasLTX2Check = 
				(i2vHandler.includes('chuteUrl') && i2vHandler.includes('ltx')) ||
				(i2vHandler.includes('isLTX2') && i2vHandler.includes('ltx'));
			
			// Must have BOTH singular image AND images array logic (in different branches)
			const hasSingularImage = i2vHandler.includes('userInputs.image =');
			const hasImagesArray = i2vHandler.includes('userInputs.images =');
			
			// FAIL if no conditional check exists
			expect(hasLTX2Check).toBe(true);
			
			// FAIL if it only has one format (must support both)
			expect(hasSingularImage).toBe(true);
			expect(hasImagesArray).toBe(true);
		}
	});

	test('I2V handler must set singular image for non-LTX-2 models', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		const i2vHandlerMatch = handlerCode.match(/} else if \(operation === 'image2video'\) \{[\s\S]*?(?=\n\t} else if \(operation ===|$)/);
		
		expect(i2vHandlerMatch).toBeDefined();
		
		if (i2vHandlerMatch) {
			const i2vHandler = i2vHandlerMatch[0];
			
			// Must have an else block that sets singular image
			// Look for: else { userInputs.image = imageBase64; }
			// OR: if (!isLTX2) { userInputs.image = imageBase64; }
			const hasElseBlock = i2vHandler.includes('} else {') && 
			                     i2vHandler.includes('userInputs.image');
			const hasNegativeCheck = i2vHandler.includes('!isLTX2') || 
			                         i2vHandler.includes('!chuteUrl');
			
			expect(hasElseBlock || hasNegativeCheck).toBe(true);
		}
	});

	test('I2V handler must set images array for LTX-2', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		const i2vHandlerMatch = handlerCode.match(/} else if \(operation === 'image2video'\) \{[\s\S]*?(?=\n\t} else if \(operation ===|$)/);
		
		expect(i2vHandlerMatch).toBeDefined();
		
		if (i2vHandlerMatch) {
			const i2vHandler = i2vHandlerMatch[0];
			
			// Must have logic that sets images array for LTX-2
			// Look for: if (isLTX2) { userInputs.images = [ ... ]; }
			const hasLTX2ImagesArray = i2vHandler.includes('userInputs.images =') &&
			                           i2vHandler.includes('image_b64') &&
			                           i2vHandler.includes('frame_index') &&
			                           i2vHandler.includes('strength');
			
			expect(hasLTX2ImagesArray).toBe(true);
		}
	});
});
