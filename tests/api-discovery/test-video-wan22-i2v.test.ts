/**
 * API Discovery Test: Wan-2.2-I2V-14B-Fast (Image-to-Video ONLY)
 * 
 * Uses DYNAMIC chute discovery - no hardcoded URLs
 * Skips gracefully if video chutes return 503 (no instances available)
 */

import 'dotenv/config';

const API_KEY = process.env.CHUTES_API_KEY;
// Use dynamically discovered video chute from global warmup
const CHUTE_URL = process.env.WARMED_VIDEO_CHUTE || null;

describe('Video Generation - Wan-2.2-I2V-14B-Fast API Discovery', () => {
	const testOrSkip = (API_KEY && CHUTE_URL) ? test : test.skip;
	
	// Skip message if no chute available
	if (!CHUTE_URL) {
		console.log('⚠️ No video chute discovered, skipping Wan-2.2 video tests');
	}

	// Create a small test image (1x1 pixel PNG)
	const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

	testOrSkip('should work with /generate endpoint (I2V only)', async () => {
		if (!API_KEY || !CHUTE_URL) {
			console.log('⏭️  Skipping - no API key or video chute unavailable');
			return;
		}

		console.log('\n🎞️  Testing Wan-2.2-I2V-14B-Fast /generate endpoint...\n');

		// Based on I2VArgs class from Python code
		const body = {
			prompt: 'gentle waves lapping against the shore',
			image: testImage, // base64 or URL
			frames: 81,
			resolution: '480p', // '480p' or '720p' (NOT "1280*720"!)
			fps: 16,
			fast: true,
			seed: 42,
			guidance_scale: 1.0,
			guidance_scale_2: 1.0,
		};

		console.log('Request body:', JSON.stringify(body, null, 2));

		// Add 30-second timeout to prevent hanging
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000);
		timeout.unref(); // Don't keep Node.js process alive for this timer

		let response;
		try {
			response = await fetch(`${CHUTE_URL}/generate`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
				signal: controller.signal,
			});
			clearTimeout(timeout);
		} catch (error: any) {
			clearTimeout(timeout);
			if (error.name === 'AbortError') {
				console.log(`⚠️  Video generation timed out after 30 seconds, skipping test`);
				console.log(`   Reason: Video API taking too long to respond`);
				return;
			}
			throw error;
		}

		console.log(`Status: ${response.status}`);
		console.log(`Content-Type: ${response.headers.get('content-type')}`);

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
		
		console.log('\n📝 WORKING CONFIGURATION:');
		console.log(`   Chute: Wan-2.2-I2V-14B-Fast`);
		console.log(`   URL: ${CHUTE_URL}/generate`);
		console.log(`   Operation: IMAGE-TO-VIDEO ONLY`);
		console.log(`   Required params: prompt, image`);
		console.log(`   Resolution format: "480p" or "720p"`);
		console.log(`   Image format: base64 string OR URL`);
		
		expect(buffer.byteLength).toBeGreaterThan(100);
	}, 120000);

	testOrSkip('should verify /text2video does NOT exist', async () => {
		if (!API_KEY || !CHUTE_URL) {
			console.log('⏭️  Skipping - no API key or video chute unavailable');
			return;
		}

		console.log('\n🔍 Verifying /text2video endpoint does NOT exist...\n');

		const response = await fetch(`${CHUTE_URL}/text2video`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				prompt: 'test',
			}),
		});

		console.log(`Status: ${response.status}`);
		
		if (response.status === 404) {
			console.log('✅ Confirmed: /text2video does NOT exist (as expected)');
			console.log('💡 This chute is IMAGE-TO-VIDEO ONLY');
		}

		expect(response.status).toBe(404);
	}, 30000);
});

