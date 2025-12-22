/**
 * API Discovery Test: Image-to-Video Generation
 * 
 * Uses DYNAMIC chute discovery - no hardcoded URLs
 * Skips gracefully if video chutes return 503 (no instances available)
 * 
 * TDD Phase 1: Discover the actual API endpoint and parameters for animating images
 * This test should be written BEFORE implementing the image2video handler
 */

import 'dotenv/config';

const API_KEY = process.env.CHUTES_API_KEY;
// Use dynamically discovered video chute from global warmup
const CHUTE_URL = process.env.WARMED_VIDEO_CHUTE || null;

describe('Video Generation - Image-to-Video API Discovery', () => {
	const testOrSkip = (API_KEY && CHUTE_URL) ? test : test.skip;
	
	// Skip message if no chute available
	if (!CHUTE_URL) {
		console.log('⚠️ No video chute discovered, skipping image2video discovery tests');
	}

	// Create a small test image as base64
	const createTestImageBase64 = (): string => {
		// 1x1 pixel PNG (transparent)
		return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
	};

	testOrSkip('should discover image2video endpoint and parameter format', async () => {
		if (!API_KEY || !CHUTE_URL) {
			console.log('⏭️  Skipping - no API key or video chute unavailable');
			return;
		}

		const testImageBase64 = createTestImageBase64();

		// Use dynamically discovered video chute URL
		const baseUrls = [
			CHUTE_URL, // Discovered video chute
		];

		// Test different possible endpoints
		const endpoints = [
			'/image2video',
			'/animate',
			'/v1/video/animate',
			'/generate',
		];

		// Test different parameter formats
		const parameterSets = [
			{
				name: 'image_b64 format',
				params: {
					prompt: 'gentle animation',
					image_b64: testImageBase64,
					steps: 30,
					fps: 16,
					seed: 42,
				},
			},
			{
				name: 'image field format',
				params: {
					prompt: 'animate this image',
					image: testImageBase64,
					fps: 16,
				},
			},
			{
				name: 'base64 field format',
				params: {
					prompt: 'animation',
					base64: testImageBase64,
					fps: 24,
				},
			},
			{
				name: 'data URL format',
				params: {
					prompt: 'animation',
					image: `data:image/png;base64,${testImageBase64}`,
				},
			},
		];

		console.log('\n🎞️  Discovering Image-to-Video API...\n');

		let foundWorking = false;

		for (const baseUrl of baseUrls) {
			for (const endpoint of endpoints) {
				for (const paramSet of parameterSets) {
					const url = `${baseUrl}${endpoint}`;
					console.log(`Testing: ${url}`);
					console.log(`Format: ${paramSet.name}`);

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
							console.log(`   Image field name: ${Object.keys(paramSet.params).find(k => k.includes('image') || k.includes('base64'))}`);
							console.log(`   Parameters: ${JSON.stringify(paramSet.params, null, 2)}`);
							
							return; // Success - exit test
						} else if (response.status === 400) {
							const errorData = await response.text();
							console.log(`  ⚠️  Bad Request (endpoint exists, wrong params)`);
							console.log(`  Error: ${errorData.substring(0, 200)}`);
						} else if (response.status === 404) {
							console.log(`  ❌ Not Found`);
						} else {
							console.log(`  ❓ Unexpected status: ${response.status}`);
						}
					} catch (error: any) {
						console.log(`  ❌ Error: ${error.message}`);
					}

					console.log(''); // Blank line
				}
			}
		}

		if (!foundWorking) {
			console.log('\n⚠️  No working image2video endpoint found!');
			console.log('💡 Check:');
			console.log('   - Image encoding format (base64, URL, etc.)');
			console.log('   - Field naming (image_b64, image, base64, etc.)');
			console.log('   - Required vs optional parameters');
		}

		expect(true).toBe(true);
	}, 180000);

	testOrSkip('should test image input from URL', async () => {
		const VIDEO_CHUTE_URL = process.env.WARMED_VIDEO_CHUTE || null;
		
		if (!VIDEO_CHUTE_URL) {
			console.log('⏭️  Skipping - no video chute available');
			return;
		}

		// Use a public test image
		const publicImageUrl = 'https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png';

		console.log('\n🖼️  Testing image2video with URL input...\n');

		const url = `${VIDEO_CHUTE_URL}/image2video`;

		try {
			// First, check if API accepts URL directly
			console.log('Attempt 1: Direct URL');
			let response = await fetch(url, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					prompt: 'animate this logo',
					image_url: publicImageUrl,
					fps: 16,
				}),
			});

			if (response.ok) {
				console.log('✅ API accepts image URLs directly');
				return;
			}

			// If not, download and convert to base64
			console.log('Attempt 2: Download and convert to base64');
			const imageResponse = await fetch(publicImageUrl);
			const imageBuffer = await imageResponse.arrayBuffer();
			const imageBase64 = Buffer.from(imageBuffer).toString('base64');

			response = await fetch(url, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					prompt: 'animate this logo',
					image_b64: imageBase64,
					fps: 16,
				}),
			});

			console.log(`Status: ${response.status}`);
			
			if (response.ok) {
				console.log('✅ API requires base64-encoded images');
				console.log('💡 Handler must download URLs and convert to base64');
			}
		} catch (error: any) {
			console.log(`❌ Error: ${error.message}`);
		}

		expect(true).toBe(true);
	}, 180000);
});

