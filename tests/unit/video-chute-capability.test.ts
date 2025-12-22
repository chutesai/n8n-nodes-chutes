/**
 * TDD: Video Chute Capability Detection
 * 
 * Tests the capability detection functions for video chutes (T2V vs I2V support)
 * This is a UNIT TEST - no API calls, no global warmup needed
 */

import { supportsTextToVideo, supportsImageToVideo } from '../integration/test-helpers';

describe('Video Chute Capability Detection', () => {
	describe('Text-to-Video (T2V) Detection', () => {
		test('should detect T2V support from chute name with "T2V"', () => {
			expect(supportsTextToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Wan2.2 T2V - Generate videos from text...',
			})).toBe(true);
		});

		test('should detect T2V support from description', () => {
			expect(supportsTextToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Video Model',
				description: 'Generate videos from text prompts using text-to-video',
			})).toBe(true);
		});

		test('should detect T2V in "text2video" format', () => {
			expect(supportsTextToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Advanced text2video generator',
			})).toBe(true);
		});

		test('should detect dual support (text and image to video)', () => {
			expect(supportsTextToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'HunyuanVideo - Text and image to video...',
			})).toBe(true);
		});

		test('should NOT detect T2V for I2V-only chutes', () => {
			expect(supportsTextToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Wan 2.2 I2V Fast - Animate images into videos...',
			})).toBe(false);
		});

		test('should detect T2V case-insensitively', () => {
			expect(supportsTextToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'WAN2.2 t2v - GENERATE VIDEOS FROM TEXT',
			})).toBe(true);
		});
	});

	describe('Image-to-Video (I2V) Detection', () => {
		test('should detect I2V support from chute name', () => {
			expect(supportsImageToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Wan 2.2 I2V Fast - Animate images into videos...',
			})).toBe(true);
		});

		test('should detect I2V support from description', () => {
			expect(supportsImageToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Video Model',
				description: 'Animate images into videos using image-to-video',
			})).toBe(true);
		});

		test('should detect I2V in "img2vid" format', () => {
			expect(supportsImageToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Advanced img2vid generator',
			})).toBe(true);
		});

		test('should detect dual support (text and image to video)', () => {
			expect(supportsImageToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'HunyuanVideo - Text and image to video...',
			})).toBe(true);
		});

		test('should detect I2V for T2V chutes (most T2V models also support I2V)', () => {
			// Most modern video models support both T2V and I2V
			expect(supportsImageToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Wan2.2 T2V - Generate videos from text...',
			})).toBe(true); // T2V models usually support I2V as well
		});

		test('should NOT detect I2V for I2V-only chutes to have T2V support', () => {
			// This tests the inverse - I2V-only should NOT have T2V
			expect(supportsTextToVideo({ 
				chute_id: '1', 
				slug: 'test', 
				name: 'Wan 2.2 I2V Fast - Animate images into videos...',
			})).toBe(false);
		});
	});

	describe('Real-world Chute Names', () => {
		test('Wan-2.2-I2V-14B-Fast should be I2V-only (not T2V)', () => {
			const chute = {
				chute_id: '1',
				slug: 'wan-i2v',
				name: 'Wan-2.2-I2V-14B-Fast',
			};
			
			expect(supportsImageToVideo(chute)).toBe(true);
			expect(supportsTextToVideo(chute)).toBe(false); // CRITICAL: Should NOT support T2V
		});

		test('HunyuanVideo should support both T2V and I2V', () => {
			const chute = {
				chute_id: '2',
				slug: 'hunyuan',
				name: 'HunyuanVideo - Text and image to video...',
			};
			
			expect(supportsTextToVideo(chute)).toBe(true);
			expect(supportsImageToVideo(chute)).toBe(true);
		});

		test('Hypothetical T2V-only chute', () => {
			const chute = {
				chute_id: '3',
				slug: 'cogvideo',
				name: 'CogVideoX T2V - Generate videos from text',
			};
			
			expect(supportsTextToVideo(chute)).toBe(true);
			expect(supportsImageToVideo(chute)).toBe(true); // T2V models usually support I2V too
		});
	});
});

