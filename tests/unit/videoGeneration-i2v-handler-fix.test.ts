/**
 * Test: I2V handler should use images array format
 * 
 * Bug: I2V handler is using `userInputs.image` which doesn't match the chute API.
 * Fix: Change to `userInputs.images` array like keyframe uses.
 * 
 * This test checks the actual handler code in Chutes.node.ts
 */

import fs from 'fs';
import path from 'path';

describe('I2V Handler Images Array Fix', () => {
	const handlerFilePath = path.join(__dirname, '../../nodes/Chutes/Chutes.node.ts');
	
	it('should use images array in I2V handler (not singular image)', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		
		// Find the I2V handler
		const i2vHandlerMatch = handlerCode.match(/} else if \(operation === 'image2video'\) \{[\s\S]*?(?=\n\t} else if \(operation ===|$)/);
		
		expect(i2vHandlerMatch).toBeDefined();
		
		if (i2vHandlerMatch) {
			const i2vHandler = i2vHandlerMatch[0];
			
			// Should set userInputs.images (array), not userInputs.image (string)
			const usesImagesArray = i2vHandler.includes('userInputs.images');
			const usesSingularImage = i2vHandler.match(/userInputs\.image\s*=/);
			
			expect(usesImagesArray).toBe(true);
			expect(usesSingularImage).toBeNull(); // Should NOT have userInputs.image =
		}
	});

	it('should construct images array with proper structure for I2V', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		
		const i2vHandlerMatch = handlerCode.match(/} else if \(operation === 'image2video'\) \{[\s\S]*?(?=\n\t} else if \(operation ===|$)/);
		
		expect(i2vHandlerMatch).toBeDefined();
		
		if (i2vHandlerMatch) {
			const i2vHandler = i2vHandlerMatch[0];
			
			// Should construct array with image_b64, frame_index, strength
			const hasImageB64 = i2vHandler.includes('image_b64');
			const hasFrameIndex = i2vHandler.includes('frame_index') || i2vHandler.includes('image_frame_index');
			const hasStrength = i2vHandler.includes('strength') || i2vHandler.includes('image_strength');
			
			expect(hasImageB64).toBe(true);
			expect(hasFrameIndex).toBe(true);
			expect(hasStrength).toBe(true);
		}
	});

	it('should use same images array format as keyframe handler', () => {
		const handlerCode = fs.readFileSync(handlerFilePath, 'utf-8');
		
		// Find keyframe handler
		const keyframeHandlerMatch = handlerCode.match(/} else if \(operation === 'keyframe'\) \{[\s\S]*?(?=\n\t} else if|$)/);
		
		// Find I2V handler
		const i2vHandlerMatch = handlerCode.match(/} else if \(operation === 'image2video'\) \{[\s\S]*?(?=\n\t} else if \(operation ===|$)/);
		
		expect(keyframeHandlerMatch).toBeDefined();
		expect(i2vHandlerMatch).toBeDefined();
		
		if (keyframeHandlerMatch && i2vHandlerMatch) {
			const keyframeHandler = keyframeHandlerMatch[0];
			const i2vHandler = i2vHandlerMatch[0];
			
			// Both should use userInputs.images
			const keyframeUsesImages = keyframeHandler.includes('userInputs.images');
			const i2vUsesImages = i2vHandler.includes('userInputs.images');
			
			expect(keyframeUsesImages).toBe(true);
			expect(i2vUsesImages).toBe(true); // This should FAIL until we implement it
		}
	});
});
