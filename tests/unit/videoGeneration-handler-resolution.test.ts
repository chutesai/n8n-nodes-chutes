/**
 * TDD Test: Video Generation Handler - Resolution Rounding
 * 
 * Tests that the handler correctly passes chuteUrl to buildRequestBody
 * so LTX-2 resolution rounding is applied.
 */

import { buildRequestBody, ChuteCapabilities } from '../../nodes/Chutes/transport/openApiDiscovery';
import { IDataObject } from 'n8n-workflow';

describe('Video Generation Handler - Resolution Rounding', () => {
	test('buildRequestBody should round LTX-2 resolution when chuteUrl is provided', () => {
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
			prompt: 'test video',
			resolution: '1280*768', // Should round to 1280*768 -> 1280*768 (64) or 1280*704 (nearest 64)
		};

		// Simulate what the handler should do: pass chuteUrl
		const chuteUrl = 'https://chutes-ltx-2.chutes.ai';
		const result = buildRequestBody('text2video', capabilities, userInputs, chuteUrl);

		expect(result).toBeDefined();
		expect(result!.body.width).toBe(1280); // 1280 is divisible by 64
		expect(result!.body.height).toBe(768); // 768 is divisible by 64 (768 / 64 = 12)
	});

	test('buildRequestBody should NOT round non-LTX-2 resolution when chuteUrl is provided', () => {
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
			prompt: 'test video',
			resolution: '1280*768',
		};

		// Non-LTX-2 chute URL
		const chuteUrl = 'https://wan22-fast.chutes.ai';
		const result = buildRequestBody('text2video', capabilities, userInputs, chuteUrl);

		expect(result).toBeDefined();
		expect(result!.body.width).toBe(1280); // No rounding
		expect(result!.body.height).toBe(768); // No rounding
	});

	test('buildRequestBody should NOT round when chuteUrl is missing (current bug)', () => {
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
			prompt: 'test video',
			resolution: '1280*768',
		};

		// Call without chuteUrl (current bug in handler)
		const result = buildRequestBody('text2video', capabilities, userInputs);

		expect(result).toBeDefined();
		// Without chuteUrl, no rounding happens
		expect(result!.body.width).toBe(1280);
		expect(result!.body.height).toBe(768);
	});
});
