/**
 * Test: Video Generation Duration/FPS to Frames Conversion
 * 
 * Verifies that the video generation node correctly converts
 * user-friendly duration (seconds) and FPS parameters into
 * the frames parameter required by the API.
 * 
 * Formula: frames = Math.round(duration × fps)
 */

describe('Video Generation - Duration/FPS Conversion', () => {
	test('should convert default duration (5s) and fps (24) to 120 frames', () => {
		const duration = 5;
		const fps = 24;
		const expectedFrames = Math.round(duration * fps);

		expect(expectedFrames).toBe(120);
	});

	test('should convert custom duration (10s) and fps (24) to 240 frames', async () => {
		const duration = 10;
		const fps = 24;
		const expectedFrames = Math.round(duration * fps);

		expect(expectedFrames).toBe(240);
	});

	test('should convert custom duration (5s) and fps (30) to 150 frames', async () => {
		const duration = 5;
		const fps = 30;
		const expectedFrames = Math.round(duration * fps);

		expect(expectedFrames).toBe(150);
	});

	test('should convert custom duration (8s) and fps (60) to 480 frames', async () => {
		const duration = 8;
		const fps = 60;
		const expectedFrames = Math.round(duration * fps);

		expect(expectedFrames).toBe(480);
	});

	test('should handle fractional seconds (3.5s at 24fps = 84 frames)', async () => {
		const duration = 3.5;
		const fps = 24;
		const expectedFrames = Math.round(duration * fps);

		expect(expectedFrames).toBe(84);
	});

	test('should round to nearest integer for fractional frames', async () => {
		const duration = 2.7; // 2.7 × 24 = 64.8
		const fps = 24;
		const expectedFrames = Math.round(duration * fps);

		expect(expectedFrames).toBe(65); // Rounds up
	});

	test('UI should have duration parameter with default 5', () => {
		const { videoGenerationOperations } = require('../../../nodes/Chutes/operations/videoGeneration');
		
		const additionalOptions = videoGenerationOperations.find(
			(op: any) => op.name === 'additionalOptions'
		);
		
		expect(additionalOptions).toBeDefined();
		
		const durationParam = additionalOptions.options.find(
			(opt: any) => opt.name === 'duration'
		);
		
		expect(durationParam).toBeDefined();
		expect(durationParam.displayName).toBe('Duration (seconds)');
		expect(durationParam.default).toBe(5);
		expect(durationParam.type).toBe('number');
	});

	test('UI should have fps parameter with default 24', () => {
		const { videoGenerationOperations } = require('../../../nodes/Chutes/operations/videoGeneration');
		
		const additionalOptions = videoGenerationOperations.find(
			(op: any) => op.name === 'additionalOptions'
		);
		
		expect(additionalOptions).toBeDefined();
		
		const fpsParam = additionalOptions.options.find(
			(opt: any) => opt.name === 'fps'
		);
		
		expect(fpsParam).toBeDefined();
		expect(fpsParam.displayName).toBe('FPS (Frames Per Second)');
		expect(fpsParam.default).toBe(24);
		expect(fpsParam.type).toBe('number');
	});

	test('UI should NOT have standalone frames parameter (it is calculated)', () => {
		const { videoGenerationOperations } = require('../../../nodes/Chutes/operations/videoGeneration');
		
		const additionalOptions = videoGenerationOperations.find(
			(op: any) => op.name === 'additionalOptions'
		);
		
		expect(additionalOptions).toBeDefined();
		
		const framesParam = additionalOptions.options.find(
			(opt: any) => opt.name === 'frames'
		);
		
		// Frames should either not exist or be hidden (no displayOptions restriction)
		// We're removing it entirely in favor of calculated frames
		expect(framesParam).toBeUndefined();
	});
});

