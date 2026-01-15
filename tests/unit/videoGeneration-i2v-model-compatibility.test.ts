/**
 * TDD Test: I2V Model Compatibility
 * 
 * CRITICAL: I2V handler MUST use different parameter formats for different models:
 * - LTX-2: uses images array format [{ image_b64, frame_index, strength }]
 * - Wan-2.2: uses singular image parameter (backward compatibility)
 * 
 * This tests ACTUAL BEHAVIOR via buildRequestBody, not source code grep.
 */

import { buildRequestBody, ChuteCapabilities } from '../../nodes/Chutes/transport/openApiDiscovery';
import { IDataObject } from 'n8n-workflow';

describe('I2V Model Compatibility - Parameter Formats', () => {
	/**
	 * Test 1: Wan-2.2 I2V should use singular image parameter (BACKWARD COMPATIBILITY)
	 * This should PASS initially (before breaking change), FAIL now (after breaking change)
	 */
	test('Wan-2.2 I2V should send singular image parameter (NOT images array)', () => {
		const capabilities: ChuteCapabilities = {
			endpoints: [{
				path: '/generate',
				method: 'POST',
				parameters: [
					{ name: 'prompt', required: true, type: 'string' },
					{ name: 'image', required: true, type: 'string' },
					{ name: 'frames', required: false, type: 'integer' },
				],
			}],
			supportsTextToVideo: false,
			supportsImageToVideo: true,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			imageToVideoPath: '/generate',
		};

		const userInputs: IDataObject = {
			prompt: 'waves on shore',
			image: 'base64-image-data',
		};

		// Wan-2.2 chute URL
		const chuteUrl = 'https://wan-2-2-i2v-14b-fast.chutes.ai';
		const result = buildRequestBody('image2video', capabilities, userInputs, chuteUrl);

		expect(result).toBeDefined();
		expect(result!.body.prompt).toBe('waves on shore');
		
		// CRITICAL: Wan-2.2 expects 'image' (singular), NOT 'images' (array)
		expect(result!.body.image).toBe('base64-image-data');
		expect(result!.body.images).toBeUndefined();
	});

	/**
	 * Test 2: LTX-2 I2V should use images array format
	 * This should FAIL initially (before fix), PASS after fix
	 */
	test('LTX-2 I2V should send images array parameter (NOT singular image)', () => {
		const capabilities: ChuteCapabilities = {
			endpoints: [{
				path: '/generate',
				method: 'POST',
				parameters: [
					{ name: 'prompt', required: true, type: 'string' },
					{ name: 'images', required: false, type: 'array' },
					{ name: 'num_frames', required: false, type: 'integer' },
				],
			}],
			supportsTextToVideo: true,
			supportsImageToVideo: true,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			textToVideoPath: '/generate',
			imageToVideoPath: '/generate',
		};

		const userInputs: IDataObject = {
			prompt: 'syrup flowing',
			images: [
				{
					image_b64: 'base64-image-data',
					frame_index: 0,
					strength: 1.0,
				},
			],
		};

		// LTX-2 chute URL
		const chuteUrl = 'https://chutes-ltx-2.chutes.ai';
		const result = buildRequestBody('image2video', capabilities, userInputs, chuteUrl);

		expect(result).toBeDefined();
		expect(result!.body.prompt).toBe('syrup flowing');
		
		// CRITICAL: LTX-2 expects 'images' (array), NOT 'image' (singular)
		expect(result!.body.images).toBeDefined();
		expect(Array.isArray(result!.body.images)).toBe(true);
		const images = result!.body.images as Array<{image_b64: string; frame_index: number; strength: number}>;
		expect(images[0].image_b64).toBe('base64-image-data');
		expect(result!.body.image).toBeUndefined();
	});

	/**
	 * Test 3: Non-LTX-2 chutes should NOT use images array
	 */
	test('Other I2V models should use singular image (like Wan-2.2)', () => {
		const capabilities: ChuteCapabilities = {
			endpoints: [{
				path: '/generate',
				method: 'POST',
				parameters: [
					{ name: 'prompt', required: true, type: 'string' },
					{ name: 'image', required: true, type: 'string' },
				],
			}],
			supportsTextToVideo: false,
			supportsImageToVideo: true,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			imageToVideoPath: '/generate',
		};

		const userInputs: IDataObject = {
			prompt: 'test',
			image: 'base64-data',
		};

		// Generic video chute (NOT LTX-2)
		const chuteUrl = 'https://hunyuan-video.chutes.ai';
		const result = buildRequestBody('image2video', capabilities, userInputs, chuteUrl);

		expect(result).toBeDefined();
		// Should use singular image (Wan-2.2 format)
		expect(result!.body.image).toBe('base64-data');
		expect(result!.body.images).toBeUndefined();
	});
});
