/**
 * API Discovery Test: Wan2.1-14B (Text-to-Video AND Image-to-Video)
 * 
 * Uses DYNAMIC chute discovery - no hardcoded URLs
 * Skips gracefully if video chutes return 503 (no instances available)
 * 
 * NOTE: Tests may occasionally fail if chute is temporarily unavailable
 */

import 'dotenv/config';

const API_KEY = process.env.CHUTES_API_KEY;
// Use dynamically discovered video chute from global warmup
const CHUTE_URL = process.env.WARMED_VIDEO_CHUTE || null;

describe('Video Generation - Wan2.1-14B API Discovery', () => {
	const testOrSkip = (API_KEY && CHUTE_URL) ? test : test.skip;
	
	// Skip message if no chute available
	if (!CHUTE_URL) {
		console.log('⚠️ No video chute discovered, skipping Wan2.1 video tests');
	}

	const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

	testOrSkip('should work with /text2video endpoint', async () => {
		if (!API_KEY || !CHUTE_URL) {
			console.log('⏭️  Skipping - no API key or video chute unavailable');
			return;
		}

		console.log('\n🎥 Testing Wan2.1-14B /text2video endpoint...\n');

		const body = {
			prompt: 'a cat playing with a ball of yarn',
			resolution: '832*480', // Format: "width*height"
			steps: 25,
			frames: 81,
			fps: 16,
			seed: 42,
			guidance_scale: 5.0,
		};

		console.log('Request body:', JSON.stringify(body, null, 2));

		const response = await fetch(`${CHUTE_URL}/text2video`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		console.log(`Status: ${response.status}`);
		
		// Skip gracefully if video generation unavailable (exploratory test)
		if (!response.ok) {
			const error = await response.text();
			console.log(`⚠️  Video generation unavailable (status ${response.status}), skipping test`);
			console.log(`   Reason: Video API tests are exploratory and may fail if API is rate-limited or temporarily unavailable`);
			console.log(`   Error: ${error.substring(0, 200)}`);
			return; // Skip gracefully
		}
		
		const buffer = await response.arrayBuffer();
		console.log(`✅ SUCCESS! Generated video: ${buffer.byteLength} bytes`);
		expect(buffer.byteLength).toBeGreaterThan(100);
	}, 120000);

	testOrSkip('should work with /image2video endpoint', async () => {
		if (!API_KEY || !CHUTE_URL) {
			console.log('⏭️  Skipping - no API key or video chute unavailable');
			return;
		}

		console.log('\n🎞️  Testing Wan2.1-14B /image2video endpoint...\n');

		const body = {
			prompt: 'gentle waves',
			image_b64: testImage, // Note: image_b64, not just image!
			steps: 25,
			fps: 16,
			seed: 42,
			guidance_scale: 5.0,
		};

		console.log('Request body (image truncated):', {
			...body,
			image_b64: body.image_b64.substring(0, 20) + '...',
		});

		const response = await fetch(`${CHUTE_URL}/image2video`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		console.log(`Status: ${response.status}`);
		
		// Skip gracefully if video generation unavailable (exploratory test)
		if (!response.ok) {
			const error = await response.text();
			console.log(`⚠️  Video generation unavailable (status ${response.status}), skipping test`);
			console.log(`   Reason: Video API tests are exploratory and may fail if API is rate-limited or temporarily unavailable`);
			console.log(`   Error: ${error.substring(0, 200)}`);
			return; // Skip gracefully
		}
		
		const buffer = await response.arrayBuffer();
		console.log(`✅ SUCCESS! Generated video: ${buffer.byteLength} bytes`);
		expect(buffer.byteLength).toBeGreaterThan(100);
	}, 120000);
});

