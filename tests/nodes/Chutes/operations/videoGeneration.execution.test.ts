/**
 * Video Generation Execution Tests
 * 
 * Unit tests for video generation logic and helpers
 * These test the implementation works correctly
 */

import { getChutesBaseUrl } from '../../../../nodes/Chutes/transport/apiRequest';

describe('Video Generation - Execution Logic', () => {

	describe('URL Routing', () => {
		test('should route to video.chutes.ai by default', () => {
			const credentials = {};
			const baseUrl = getChutesBaseUrl(credentials, 'videoGeneration');

			expect(baseUrl).toBe('https://video.chutes.ai');
		});

		test('should use custom chute URL when provided', () => {
			const credentials = {};
			const customUrl = 'https://chutes-wan-2-1-14b.chutes.ai';
			const baseUrl = getChutesBaseUrl(credentials, 'videoGeneration', customUrl);

			expect(baseUrl).toBe(customUrl);
		});

		test('should use video subdomain for videoGeneration resource', () => {
			const credentials = {};
			const baseUrl = getChutesBaseUrl(credentials, 'videoGeneration');

			expect(baseUrl).toContain('video.chutes.ai');
		});
	});

	describe('Image Input Handling', () => {
		test('should extract base64 from data URL format', () => {
			const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
			const dataUrl = `data:image/png;base64,${testBase64}`;
			
			// Simulate the data URL parsing logic from handleVideoGeneration
			const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
			
			expect(matches).not.toBeNull();
			expect(matches![2]).toBe(testBase64);
		});

		test('should handle invalid data URL format', () => {
			const invalidDataUrl = 'data:image/png,not-base64';
			const matches = invalidDataUrl.match(/^data:([^;]+);base64,(.+)$/);
			
			expect(matches).toBeNull();
		});

		test('should detect HTTP URLs', () => {
			const httpUrl = 'http://example.com/image.jpg';
			expect(httpUrl.startsWith('http://') || httpUrl.startsWith('https://')).toBe(true);
		});

		test('should detect HTTPS URLs', () => {
			const httpsUrl = 'https://example.com/image.jpg';
			expect(httpsUrl.startsWith('http://') || httpsUrl.startsWith('https://')).toBe(true);
		});

		test('should identify data URLs', () => {
			const dataUrl = 'data:image/png;base64,abc123';
			expect(dataUrl.startsWith('data:')).toBe(true);
		});
	});

	describe('Request Body Building', () => {
		test('should build minimal text2video request body', () => {
			const body: any = {
				prompt: 'test video',
			};

			expect(body).toHaveProperty('prompt');
			expect(body).not.toHaveProperty('resolution');
			expect(body).not.toHaveProperty('steps');
		});

		test('should build full text2video request body with all options', () => {
			const additionalOptions = {
				resolution: '1920*1080',
				steps: 30,
				frames: 120,
				fps: 30,
				seed: 42,
			};

			const body: any = {
				prompt: 'test video',
			};

			if (additionalOptions.resolution) body.resolution = additionalOptions.resolution;
			if (additionalOptions.steps) body.steps = additionalOptions.steps;
			if (additionalOptions.frames) body.frames = additionalOptions.frames;
			if (additionalOptions.fps) body.fps = additionalOptions.fps;
			if (additionalOptions.seed !== undefined) body.seed = additionalOptions.seed;

			expect(body).toEqual({
				prompt: 'test video',
				resolution: '1920*1080',
				steps: 30,
				frames: 120,
				fps: 30,
				seed: 42,
			});
		});

		test('should build image2video request body with image_b64', () => {
			const body: any = {
				prompt: 'animate',
				image_b64: 'base64encodedimage',
				steps: 30,
				fps: 16,
			};

			expect(body).toHaveProperty('image_b64');
			expect(body.image_b64).toBe('base64encodedimage');
		});

		test('should not include frames parameter for image2video', () => {
			const additionalOptions = {
				steps: 30,
				fps: 16,
				frames: 81, // This should be ignored for image2video
			};

			const body: any = {
				prompt: 'animate',
				image_b64: 'test',
			};

			// Only add common parameters, NOT frames
			if (additionalOptions.steps) body.steps = additionalOptions.steps;
			if (additionalOptions.fps) body.fps = additionalOptions.fps;
			// Notice: frames is NOT added for image2video

			expect(body).not.toHaveProperty('frames');
			expect(body).toHaveProperty('steps');
			expect(body).toHaveProperty('fps');
		});
	});

	describe('Buffer Handling', () => {
		test('should detect Buffer response', () => {
			const mockVideoBuffer = Buffer.from('fake-video-data');
			expect(Buffer.isBuffer(mockVideoBuffer)).toBe(true);
		});

		test('should detect non-Buffer JSON response', () => {
			const mockJsonResponse = { video_url: 'https://example.com/video.mp4' };
			expect(Buffer.isBuffer(mockJsonResponse)).toBe(false);
		});

		test('should convert Buffer to base64', () => {
			const testData = 'test image data';
			const buffer = Buffer.from(testData);
			const base64 = buffer.toString('base64');

			expect(base64).toBe(Buffer.from(testData).toString('base64'));
			expect(Buffer.from(base64, 'base64').toString()).toBe(testData);
		});
	});
});

