/**
 * TDD Test: Video-to-Video and Keyframe Handlers (Phase 3)
 * 
 * Tests that the handlers are correctly implemented in Chutes.node.ts:
 * - video2video operation handler
 * - keyframe operation handler
 * - LoRA processing
 * - buildRequestBody supports new operations
 */

import { buildRequestBody, ChuteCapabilities } from '../../nodes/Chutes/transport/openApiDiscovery';
import { IDataObject } from 'n8n-workflow';

describe('Video-to-Video and Keyframe Handlers (Phase 3)', () => {
	describe('buildRequestBody for video2video', () => {
		test('should find endpoint for video2video operation', () => {
			const capabilities: ChuteCapabilities = {
				endpoints: [{
					path: '/generate',
					method: 'POST',
					parameters: [
						{ name: 'prompt', required: true, type: 'string' },
						{ name: 'video_b64', required: false, type: 'string' },
						{ name: 'pipeline', required: false, type: 'string' },
					],
				}],
				supportsTextToVideo: true,
				supportsImageToVideo: false,
				supportsImageEdit: false,
				supportsVideoToVideo: true,
				supportsKeyframeInterp: false,
				textToVideoPath: '/generate',
				videoToVideoPath: '/generate',
			};

			const userInputs: IDataObject = {
				prompt: 'Apply cinematic color grading',
				video_b64: 'fake-base64-video-data',
				pipeline: 'ic_lora',
			};

			const result = buildRequestBody('video2video', capabilities, userInputs);

			expect(result).toBeDefined();
			expect(result!.endpoint).toBe('/generate');
			expect(result!.body.prompt).toBe('Apply cinematic color grading');
			expect(result!.body.pipeline).toBe('ic_lora');
		});
	});

	describe('buildRequestBody for keyframe', () => {
		test('should find endpoint for keyframe operation', () => {
			const capabilities: ChuteCapabilities = {
				endpoints: [{
					path: '/generate',
					method: 'POST',
					parameters: [
						{ name: 'prompt', required: true, type: 'string' },
						{ name: 'images', required: false, type: 'array' },
						{ name: 'pipeline', required: false, type: 'string' },
					],
				}],
				supportsTextToVideo: true,
				supportsImageToVideo: false,
				supportsImageEdit: false,
				supportsVideoToVideo: false,
				supportsKeyframeInterp: true,
				textToVideoPath: '/generate',
				keyframeInterpPath: '/generate',
			};

			const userInputs: IDataObject = {
				prompt: 'Interpolate between keyframes',
				images: [
					{ image_b64: 'img1', frame_index: 0, strength: 1.0 },
					{ image_b64: 'img2', frame_index: 50, strength: 1.0 },
				],
				pipeline: 'keyframe_interp',
			};

			const result = buildRequestBody('keyframe', capabilities, userInputs);

			expect(result).toBeDefined();
			expect(result!.endpoint).toBe('/generate');
			expect(result!.body.prompt).toBe('Interpolate between keyframes');
			expect(result!.body.pipeline).toBe('keyframe_interp');
		});
	});

	describe('LoRA processing', () => {
		test('should handle LoRA array in buildRequestBody', () => {
			const capabilities: ChuteCapabilities = {
				endpoints: [{
					path: '/generate',
					method: 'POST',
					parameters: [
						{ name: 'prompt', required: true, type: 'string' },
						{ name: 'loras', required: false, type: 'array' },
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
				prompt: 'A cinematic video',
				loras: [
					{ name: 'camera-dolly-in', strength: 1.0 },
					{ name: 'detailer', strength: 0.8 },
				],
			};

			const result = buildRequestBody('text2video', capabilities, userInputs);

			expect(result).toBeDefined();
			expect(result!.body.loras).toBeDefined();
			expect(Array.isArray(result!.body.loras)).toBe(true);
			expect(result!.body.loras).toHaveLength(2);
		});
	});
});
