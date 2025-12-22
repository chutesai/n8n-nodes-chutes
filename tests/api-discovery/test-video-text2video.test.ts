/**
 * API Discovery Test: Text-to-Video Generation
 * 
 * TDD Phase 1: Discover the actual API endpoint and parameters
 * This test should be written BEFORE implementing the video generation handler
 * 
 * UPDATED: Now checks chute capabilities to ensure we don't try to use
 * image-to-video (I2V) chutes for text-to-video (T2V) tests.
 */

import 'dotenv/config';
import { supportsTextToVideo } from '../integration/test-helpers';

const API_KEY = process.env.CHUTES_API_KEY;
const VIDEO_CHUTE_URL = process.env.WARMED_VIDEO_CHUTE || null; // Use dynamically warmed chute
const VIDEO_CHUTE_NAME = process.env.WARMED_VIDEO_CHUTE_NAME || null; // For capability checking

describe('Video Generation - Text-to-Video API Discovery', () => {
	// Skip if no API key or no video chute available
	const testOrSkip = (API_KEY && VIDEO_CHUTE_URL) ? test : test.skip;

	testOrSkip('should discover text2video endpoint and parameters', async () => {
		if (!VIDEO_CHUTE_URL) {
			console.log('⏭️  Skipping - no video chute available');
			return;
		}

		// Check if the video chute supports text-to-video
		if (VIDEO_CHUTE_NAME && !supportsTextToVideo({ name: VIDEO_CHUTE_NAME })) {
			console.log(`⏭️  Skipping - video chute "${VIDEO_CHUTE_NAME}" only supports image-to-video (I2V), not text-to-video (T2V)`);
			return;
		}

		// Test with dynamically discovered video chute
		const baseUrls = [
			VIDEO_CHUTE_URL,
		];

		// Test different possible endpoints
		const endpoints = [
			'/text2video',
			'/generate',
			'/v1/video/generate',
			'/create',
		];

		// Test different parameter formats
		const parameterSets = [
			{
				name: 'Full parameters',
				params: {
					prompt: 'a cat playing with a ball of yarn',
					resolution: '1280*720',
					steps: 25,
					frames: 81,
					fps: 24,
					seed: 12345,
				},
			},
			{
				name: 'Minimal parameters',
				params: {
					prompt: 'test video',
					fps: 16,
					frames: 24,
				},
			},
			{
				name: 'Alternative naming',
				params: {
					prompt: 'test',
					width: 1280,
					height: 720,
					num_frames: 81,
					guidance_scale: 1,
				},
			},
		];

		console.log('\n🎥 Discovering Text-to-Video API...\n');

		let foundWorking = false;

		for (const baseUrl of baseUrls) {
			for (const endpoint of endpoints) {
				for (const paramSet of parameterSets) {
					const url = `${baseUrl}${endpoint}`;
					console.log(`Testing: ${url}`);
					console.log(`Parameters: ${paramSet.name}`);

					try {
						const response = await fetch(url, {
							method: 'POST',
							headers: {
								'Authorization': `Bearer ${API_KEY}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(paramSet.params),
						});

						console.log(`  Status: ${response.status}`);

						if (response.status === 200 || response.status === 202) {
							console.log('  ✅ SUCCESS! Found working endpoint!');
							console.log(`  URL: ${url}`);
							console.log(`  Parameters: ${JSON.stringify(paramSet.params, null, 2)}`);

							// Check response format
							const contentType = response.headers.get('content-type');
							console.log(`  Content-Type: ${contentType}`);

							if (contentType?.includes('video')) {
								const videoBuffer = await response.arrayBuffer();
								console.log(`  Response: Binary video data (${videoBuffer.byteLength} bytes)`);
							} else {
								const responseData = await response.json();
								console.log(`  Response: ${JSON.stringify(responseData, null, 2)}`);
							}

							foundWorking = true;
							
							// Document the working configuration
							console.log('\n📝 DOCUMENTED WORKING CONFIGURATION:');
							console.log(`   Endpoint: ${endpoint}`);
							console.log(`   Base URL: ${baseUrl}`);
							console.log(`   Parameters: ${paramSet.name}`);
							console.log(`   Request body: ${JSON.stringify(paramSet.params, null, 2)}`);
							
							return; // Success - exit test
						} else if (response.status === 400) {
							const errorData = await response.text();
							console.log(`  ⚠️  Bad Request (endpoint exists, wrong params)`);
							console.log(`  Error: ${errorData.substring(0, 200)}`);
						} else if (response.status === 404) {
							console.log(`  ❌ Not Found`);
						} else {
							console.log(`  ❓ Unexpected status`);
						}
					} catch (error: any) {
						console.log(`  ❌ Error: ${error.message}`);
					}

					console.log(''); // Blank line between attempts
				}
			}
		}

		if (!foundWorking) {
			console.log('\n⚠️  No working text2video endpoint found!');
			console.log('💡 This means the API might:');
			console.log('   - Use different parameter names');
			console.log('   - Require authentication in a different format');
			console.log('   - Have a different endpoint path');
			console.log('   - Not support this operation yet');
		}

		// Test should document findings even if no working endpoint found
		expect(true).toBe(true);
	}, 120000); // 2 minute timeout for video generation

	testOrSkip('should test response time and timeout behavior', async () => {
		if (!VIDEO_CHUTE_URL) {
			console.log('⏭️  Skipping - no video chute available');
			return;
		}

		const url = `${VIDEO_CHUTE_URL}/text2video`;

		console.log('\n⏱️  Testing response time for video generation...\n');

		const startTime = Date.now();

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					prompt: 'a quick test',
					fps: 16,
					frames: 24, // Minimal for speed
				}),
				signal: AbortSignal.timeout(60000), // 60 second timeout
			});

			const endTime = Date.now();
			const duration = (endTime - startTime) / 1000;

			console.log(`Status: ${response.status}`);
			console.log(`Duration: ${duration.toFixed(2)} seconds`);

			if (response.ok) {
				const contentLength = response.headers.get('content-length');
				console.log(`Content-Length: ${contentLength} bytes`);
				
				console.log('\n📊 RECOMMENDATION: Set timeout to at least', Math.ceil(duration * 2), 'seconds');
			}
		} catch (error: any) {
			const endTime = Date.now();
			const duration = (endTime - startTime) / 1000;
			
			console.log(`❌ Request failed after ${duration.toFixed(2)} seconds`);
			console.log(`Error: ${error.message}`);
		}

		expect(true).toBe(true);
	}, 120000);
});

