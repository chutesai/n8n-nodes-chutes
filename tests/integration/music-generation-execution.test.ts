/**
 * Music Generation Execution Test
 * 
 * Verifies that music generation actually works with real API calls.
 * Tests the core functionality of generating audio from text prompts.
 * 
 * Following TDD: This test should FAIL first, then we verify implementation exists.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
	testOrSkip,
	hasApiKey,
	EXTENDED_TIMEOUT,
	getAuthHeaders,
	initializeTestChutes,
	MUSIC_CHUTE_URL,
} from './test-helpers';

describe('Music Generation Execution', () => {
	// Discover chutes before running tests
	beforeAll(async () => {
		if (!hasApiKey()) {
			console.log('⚠️ CHUTES_API_KEY not set - skipping integration tests');
			return;
		}
		await initializeTestChutes();
		
		if (!MUSIC_CHUTE_URL) {
			console.log('⚠️ No music chute available - will skip music generation tests');
		}
	}, 60000); // 1 minute for discovery

	testOrSkip('should generate music from text prompt', async () => {
		if (!MUSIC_CHUTE_URL) {
			console.log('⏭️ Skipping - no music chute available');
			return;
		}

		console.log(`🎵 Testing music generation with chute: ${MUSIC_CHUTE_URL}`);

		const stylePrompt = `Upbeat lo-fi hip-hop, playful male vocals, boom-bap drums, jazzy piano chords, warm bass`;

		// LRC format with timestamps IS REQUIRED for lyrics to appear!
		// Extended to match ~60 second duration
		const lyrics = `[00:00.52]I Spotted the throne, a golden-brown tower
[00:04.02]Sunny-side up in the breakfast hour
[00:07.52]Paws took a leap, a majestic ascent
[00:11.02]A feline king on a buttery tent
[00:14.52]The hat tipped back, a cool silhouette
[00:18.02]On a grid of fluffy griddled regret
[00:21.52]A cat in a hat on a fat stack
[00:24.52]Syrup river down the side no turning back
[00:28.02]A cat in a hat on a fat stack
[00:31.02]Sticky paws no flaws conducting the snack
[00:34.52]The drizzle is art, a slow-motion cascade
[00:38.02]A sugary lava, a sweet escapade
[00:41.52]Survey the land from a pancake peak
[00:45.02]A silent meow, the statement he speaks
[00:48.52]No fork no plate, this is primal and true
[00:52.02]A mission of mess, just me and the goo
[00:55.52]Yeah, stack attack, maple drip
[00:57.52]The Purr-fect crime, a sweet syrup trip`;

		const response = await fetch(`${MUSIC_CHUTE_URL}/generate`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				style_prompt: stylePrompt,
				lyrics: lyrics,  // MUST have LRC timestamps or lyrics disappear!
				// NEW: v1.2.0 chute supports duration and quality control!
				music_duration: 60,  // 60 seconds = 1 minute song
				cfg_strength: 7.0,   // Guidance strength (1-20)
				steps: 50,           // Quality steps (20-200)
				chunked: false,      // CRITICAL: Disable chunking to avoid audio artifacts!
				file_type: "wav",    // Use WAV to avoid MP3 compression artifacts
			}),
		});

		console.log(`Response status: ${response.status}`);
		
		// Verify successful response
		expect(response.ok).toBe(true);
		expect(response.status).toBe(200);

		// Get binary audio data
		const audioBuffer = await response.arrayBuffer();
		console.log(`✅ Received ${audioBuffer.byteLength} bytes of audio data`);
		
		expect(audioBuffer.byteLength).toBeGreaterThan(0);
		expect(audioBuffer.byteLength).toBeGreaterThan(1000); // At least 1KB
		
		// WAV is uncompressed: 60s * 44100 Hz * 2 channels * 2 bytes/sample = ~10.6 MB (minimum)
		// Actual includes WAV header overhead, so expect ~16-18 MB for 60s
		const fileSizeMB = (audioBuffer.byteLength / 1024 / 1024).toFixed(2);
		console.log(`File size: ${audioBuffer.byteLength} bytes (${fileSizeMB} MB)`);
		expect(audioBuffer.byteLength).toBeGreaterThan(10 * 1024 * 1024); // > 10 MB
		expect(audioBuffer.byteLength).toBeLessThan(25 * 1024 * 1024); // < 25 MB (reasonable upper bound)

		// Verify it's a valid WAV file by checking the RIFF header
		const buffer = Buffer.from(audioBuffer);
		const header = buffer.slice(0, 12);
		const headerHex = header.toString('hex');
		
		console.log(`Audio header: ${headerHex}`);
		
		// WAV format: "RIFF" (52494646) + 4-byte size + "WAVE" (57415645)
		const isWav = headerHex.startsWith('52494646') && headerHex.includes('57415645');
		
		expect(isWav).toBe(true);
		
		// Save audio file to test-output directory
		const outputDir = path.join(__dirname, '..', 'test-output');
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}
		
		const outputPath = path.join(outputDir, 'cat-pancake.wav');
		fs.writeFileSync(outputPath, buffer);
		
		console.log(`💾 Saved audio to: ${outputPath}`);
		console.log('✅ Music generation test passed');
	}, EXTENDED_TIMEOUT);

	testOrSkip('should handle lyrics parameter', async () => {
		if (!MUSIC_CHUTE_URL) {
			console.log('⏭️ Skipping - no music chute available');
			return;
		}

		console.log('🎵 Testing with lyrics...');

		const response = await fetch(`${MUSIC_CHUTE_URL}/generate`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				style_prompt: 'calm ambient music',
				lyrics: '[00:00.00]First line\n[00:05.00]Second line',
				chunked: false,  // CRITICAL: Disable chunking to avoid audio artifacts!
				file_type: "wav",
			}),
		});

		expect(response.ok).toBe(true);
		
		const audioBuffer = await response.arrayBuffer();
		console.log(`✅ Generated ${audioBuffer.byteLength} bytes with lyrics`);
		
		expect(audioBuffer.byteLength).toBeGreaterThan(0);
	}, EXTENDED_TIMEOUT);

	testOrSkip('should handle error for missing required fields', async () => {
		if (!MUSIC_CHUTE_URL) {
			console.log('⏭️ Skipping - no music chute available');
			return;
		}

		console.log('🎵 Testing error handling for missing style_prompt...');

		const response = await fetch(`${MUSIC_CHUTE_URL}/generate`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				lyrics: '[00:00.00]Test', // Missing style_prompt - API requires either style_prompt OR audio_b64
				chunked: false,  // Always disable chunking
				file_type: "wav",
			}),
		});

		console.log(`Error response status: ${response.status}`);
		
		// Should get an error status (400 or 422)
		expect(response.ok).toBe(false);
		expect(response.status).toBeGreaterThanOrEqual(400);
		console.log('✅ Correctly rejected request without style_prompt or audio_b64');
	}, EXTENDED_TIMEOUT);
});

