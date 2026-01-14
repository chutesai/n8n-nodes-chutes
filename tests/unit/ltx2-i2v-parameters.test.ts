/**
 * TDD Test: LTX-2 Image-to-Video Parameters
 * 
 * Tests that I2V-specific parameters are handled:
 * - image_strength (controls influence of input image)
 * - image_frame_index (frame position for input image)
 * - distilled (faster pipeline)
 */

import { buildRequestBody, ChuteCapabilities } from '../../nodes/Chutes/transport/openApiDiscovery';
import { IDataObject } from 'n8n-workflow';

describe('LTX-2 Image-to-Video Parameters', () => {
	const capabilities: ChuteCapabilities = {
		endpoints: [{
			path: '/generate',
			method: 'POST',
			parameters: [
				{ name: 'prompt', required: true, type: 'string' },
				{ name: 'image_b64', required: false, type: 'string' },
				{ name: 'image_strength', required: false, type: 'number' },
				{ name: 'image_frame_index', required: false, type: 'integer' },
				{ name: 'distilled', required: false, type: 'boolean' },
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

	test('should pass image_strength parameter for I2V', () => {
		const userInputs: IDataObject = {
			prompt: 'Animate this image',
			image: 'base64-image-data',
			image_strength: 0.8,
		};

		const result = buildRequestBody('image2video', capabilities, userInputs);

		expect(result).toBeDefined();
		expect(result!.body.image_strength).toBe(0.8);
	});

	test('should pass image_frame_index parameter for I2V', () => {
		const userInputs: IDataObject = {
			prompt: 'Animate this image',
			image: 'base64-image-data',
			image_frame_index: 10,
		};

		const result = buildRequestBody('image2video', capabilities, userInputs);

		expect(result).toBeDefined();
		expect(result!.body.image_frame_index).toBe(10);
	});

	test('should pass distilled parameter', () => {
		const userInputs: IDataObject = {
			prompt: 'Generate video',
			distilled: true,
		};

		const result = buildRequestBody('text2video', capabilities, userInputs);

		expect(result).toBeDefined();
		expect(result!.body.distilled).toBe(true);
	});

	test('should pass image_strength default from handler', () => {
		// The handler (Chutes.node.ts) sets image_strength = 1.0 as default for I2V
		// Then passes it to buildRequestBody
		const userInputs: IDataObject = {
			prompt: 'Animate this image',
			image: 'base64-image-data',
			image_strength: 1.0, // Handler sets this default
		};

		const result = buildRequestBody('image2video', capabilities, userInputs);

		expect(result).toBeDefined();
		// Verify the default is passed through
		expect(result!.body.image_strength).toBe(1.0);
	});
});
