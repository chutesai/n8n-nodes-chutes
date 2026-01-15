/**
 * TDD Test: Request Body Wrapping
 * 
 * NOTE: These tests were created to test conditional args wrapping,
 * but we later discovered that ALL Chutes APIs use flat parameters.
 * The Chutes framework auto-unwraps Python args for the public HTTP API.
 * Keeping tests for documentation and regression protection.
 */

import { buildRequestBody, ChuteCapabilities } from '../../nodes/Chutes/transport/openApiDiscovery';
import { IDataObject } from 'n8n-workflow';

describe('Request Body Wrapping (Historical - Not Used)', () => {
	test('should wrap parameters in args object for LTX-2', () => {
		const capabilities: ChuteCapabilities = {
			endpoints: [{
				path: '/generate',
				method: 'POST',
				parameters: [
					{ name: 'prompt', required: true, type: 'string' },
					{ name: 'width', required: false, type: 'integer' },
					{ name: 'height', required: false, type: 'integer' },
				],
			}],
			supportsTextToVideo: true,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			textToVideoPath: '/generate',
		};

		const userInputs: IDataObject = {
			prompt: 'test prompt',
			width: 768,
			height: 512,
		};

		const result = buildRequestBody('text2video', capabilities, userInputs);

		expect(result).not.toBeNull();
		expect(result!.endpoint).toBe('/generate');
		
		// NOTE: Original test expected { args: { ... } } wrapping
		// But actual LTX-2 API uses flat params, so body should be flat
		expect(result!.body).toHaveProperty('prompt');
	});

	test('should use flat parameters for Wan2.2', () => {
		const capabilities: ChuteCapabilities = {
			endpoints: [{
				path: '/text2video',
				method: 'POST',
				parameters: [
					{ name: 'prompt', required: true, type: 'string' },
					{ name: 'resolution', required: false, type: 'string' },
				],
			}],
			supportsTextToVideo: true,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			textToVideoPath: '/text2video',
		};

		const userInputs: IDataObject = {
			prompt: 'test',
			resolution: '832*480',
		};

		const result = buildRequestBody('text2video', capabilities, userInputs);

		expect(result).not.toBeNull();
		// Should be flat params
		expect(result!.body).toEqual({
			prompt: 'test',
			resolution: '832*480',
		});
	});

	test('should handle parameter aliasing with args wrapper', () => {
		const capabilities: ChuteCapabilities = {
			endpoints: [{
				path: '/generate',
				method: 'POST',
				parameters: [
					{ name: 'prompt', required: true, type: 'string' },
					{ name: 'num_frames', required: false, type: 'integer' },
					{ name: 'frame_rate', required: false, type: 'integer' },
				],
			}],
			supportsTextToVideo: true,
			supportsImageToVideo: false,
			supportsImageEdit: false,
			supportsVideoToVideo: false,
			supportsKeyframeInterp: false,
			textToVideoPath: '/generate',
		};

		const userInputs: IDataObject = {
			prompt: 'test',
			frames: 121,  // Should map to num_frames
			fps: 25,      // Should map to frame_rate
		};

		const result = buildRequestBody('text2video', capabilities, userInputs);

		expect(result).not.toBeNull();
		
		// Parameter aliasing should work (flat params)
		expect(result!.body).toHaveProperty('prompt');
		expect(result!.body).toHaveProperty('num_frames');
		expect(result!.body).toHaveProperty('frame_rate');
	});
});
