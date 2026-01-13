/**
 * TDD Test: LTX-2 Parameter Handling
 * 
 * Tests:
 * 1. Fallback endpoint prefers /generate for modern chutes
 * 2. Resolution string converts to width/height integers
 * 3. Parameter aliasing works (frames->num_frames, fps->frame_rate, steps->num_inference_steps)
 */

import { buildRequestBody, ChuteCapabilities } from '../../nodes/Chutes/transport/openApiDiscovery';
import { IDataObject } from 'n8n-workflow';

describe('LTX-2 Parameter Handling', () => {
	describe('Fallback Endpoint Logic', () => {
		test('should use /generate fallback when no specific T2V endpoint exists (LTX-2 pattern)', () => {
			const capabilities: ChuteCapabilities = {
				endpoints: [
					{
						path: '/generate',
						method: 'POST',
						parameters: [
							{ name: 'prompt', required: true, type: 'string' },
							{ name: 'width', required: false, type: 'integer' },
						],
					},
				],
				supportsTextToVideo: true,
				supportsImageToVideo: false,
				supportsImageEdit: false,
				supportsVideoToVideo: false,
				supportsKeyframeInterp: false,
				// No specific textToVideoPath set
			};

			const userInputs: IDataObject = {
				prompt: 'test',
			};

			const result = buildRequestBody('text2video', capabilities, userInputs);

			expect(result).toBeDefined();
			// Should use /generate, not /text2video
			expect(result!.endpoint).toBe('/generate');
		});

		test('should still use /text2video for Wan2.2 when that endpoint exists', () => {
			const capabilities: ChuteCapabilities = {
				endpoints: [
					{
						path: '/text2video',
						method: 'POST',
						parameters: [
							{ name: 'prompt', required: true, type: 'string' },
						],
					},
					{
						path: '/generate',
						method: 'POST',
						parameters: [
							{ name: 'prompt', required: true, type: 'string' },
						],
					},
				],
				supportsTextToVideo: true,
				supportsImageToVideo: false,
				supportsImageEdit: false,
				supportsVideoToVideo: false,
				supportsKeyframeInterp: false,
				textToVideoPath: '/text2video',
			};

			const userInputs: IDataObject = {
				prompt: 'test',
			};

			const result = buildRequestBody('text2video', capabilities, userInputs);

			expect(result).toBeDefined();
			// Should use specific /text2video endpoint
			expect(result!.endpoint).toBe('/text2video');
		});
	});

	describe('Resolution to Width/Height Conversion', () => {
		test('should convert resolution string to width and height integers', () => {
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
				prompt: 'test',
				resolution: '1280*720', // User provides resolution string
			};

			const result = buildRequestBody('text2video', capabilities, userInputs);

			expect(result).toBeDefined();
			
			// Should convert to separate integers and round to multiples of 64 for LTX-2
			expect(result!.body.width).toBe(1280); // 1280 is already divisible by 64
			expect(result!.body.height).toBe(704); // 720 rounded to nearest 64 (704)
			
			// Should remove resolution
			expect(result!.body.resolution).toBeUndefined();
		});

		test('should NOT convert resolution if endpoint expects resolution param', () => {
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

			expect(result).toBeDefined();
			
			// Should keep resolution as-is for Wan2.2
			expect(result!.body.resolution).toBe('832*480');
			expect(result!.body.width).toBeUndefined();
			expect(result!.body.height).toBeUndefined();
		});

		test('should round width/height to multiples of 64 for LTX-2', () => {
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
				prompt: 'test',
				resolution: '1281*721', // Not divisible by 64
			};

			const result = buildRequestBody('text2video', capabilities, userInputs);

			expect(result).toBeDefined();
			
			// Should round to nearest 64
			expect(result!.body.width).toBe(1280); // 1281 -> 1280
			expect(result!.body.height).toBe(704); // 721 -> 704
		});
	});

	describe('Parameter Name Aliasing', () => {
		test('should map duration and fps to frames and frame_rate', () => {
			const capabilities: ChuteCapabilities = {
				endpoints: [{
					path: '/generate',
					method: 'POST',
					parameters: [
						{ name: 'prompt', required: true, type: 'string' },
						{ name: 'num_frames', required: false, type: 'integer' },
						{ name: 'frame_rate', required: false, type: 'number' },
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
				frames: 121,  // Should stay as num_frames
				fps: 25,      // Should map to frame_rate
			};

			const result = buildRequestBody('text2video', capabilities, userInputs);

			expect(result).toBeDefined();
			
			expect(result!.body.num_frames).toBe(121);
			expect(result!.body.frame_rate).toBe(25);
		});

		test('should map guidance_scale to cfg_guidance_scale', () => {
			const capabilities: ChuteCapabilities = {
				endpoints: [{
					path: '/generate',
					method: 'POST',
					parameters: [
						{ name: 'prompt', required: true, type: 'string' },
						{ name: 'cfg_guidance_scale', required: false, type: 'number' },
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
				guidance_scale: 5.0,  // User might use this name
			};

			const result = buildRequestBody('text2video', capabilities, userInputs);

			expect(result).toBeDefined();
			
			expect(result!.body.cfg_guidance_scale).toBe(5.0);
		});
	});
});
