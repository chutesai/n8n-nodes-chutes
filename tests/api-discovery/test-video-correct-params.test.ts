/**
 * API Discovery Test: Find the CORRECT parameters for video generation
 * 
 * Uses DYNAMIC chute discovery - no hardcoded URLs
 * Skips gracefully if video chutes return 503 (no instances available)
 * 
 * UPDATED: Now checks chute capabilities to ensure we don't try to use
 * image-to-video (I2V) chutes for text-to-video (T2V) parameter discovery.
 */

import 'dotenv/config';
import { supportsTextToVideo } from '../integration/test-helpers';

const API_KEY = process.env.CHUTES_API_KEY;
// Use dynamically discovered video chute from global warmup
const CHUTE_URL = process.env.WARMED_VIDEO_CHUTE || null;
const CHUTE_NAME = process.env.WARMED_VIDEO_CHUTE_NAME || null;

describe('Video Generation - Discover Correct Parameters', () => {
	const testOrSkip = (API_KEY && CHUTE_URL) ? test : test.skip;
	
	// Skip message if no chute available
	if (!CHUTE_URL) {
		console.log('⚠️ No video chute discovered, skipping video param discovery tests');
	}
	
	// Check if chute supports T2V
	if (CHUTE_NAME && !supportsTextToVideo({ name: CHUTE_NAME })) {
		console.log(`⚠️ Video chute "${CHUTE_NAME}" only supports I2V, skipping T2V param discovery tests`);
	}

	testOrSkip('should discover chute metadata and available cords', async () => {
		if (!API_KEY) {
			console.log('⏭️  Skipping - no API key');
			return;
		}

		// Skip if chute doesn't support T2V
		if (CHUTE_NAME && !supportsTextToVideo({ name: CHUTE_NAME })) {
			console.log(`⏭️  Skipping - chute only supports I2V, not T2V`);
			return;
		}

		console.log('\n📋 Checking chute metadata...\n');

		// Try to get chute metadata (some chutes expose this)
		const metadataEndpoints = [
			'/',
			'/info',
			'/metadata',
			'/swagger.json',
			'/openapi.json',
			'/.well-known/schema',
		];

		for (const endpoint of metadataEndpoints) {
			try {
				console.log(`Trying: ${CHUTE_URL}${endpoint}`);
				const response = await fetch(`${CHUTE_URL}${endpoint}`, {
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${API_KEY}`,
					},
				});

				console.log(`  Status: ${response.status}`);
				
				if (response.ok) {
					const data = await response.json();
					console.log('  ✅ Found metadata!');
					console.log(JSON.stringify(data, null, 2));
					break;
				}
			} catch (error: any) {
				console.log(`  ❌ ${error.message}`);
			}
		}

		expect(true).toBe(true);
	}, 30000);

	testOrSkip('should try different parameter combinations for /generate', async () => {
		if (!API_KEY) {
			console.log('⏭️  Skipping - no API key');
			return;
		}

		// Skip if chute doesn't support T2V
		if (CHUTE_NAME && !supportsTextToVideo({ name: CHUTE_NAME })) {
			console.log(`⏭️  Skipping - chute only supports I2V, not T2V`);
			return;
		}

		console.log('\n🧪 Testing different parameter sets for /generate endpoint...\n');

		// Create a tiny test image
		const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

		const parameterSets = [
			{
				name: 'Just text (minimal)',
				params: { text: 'a cat playing' },
			},
			{
				name: 'Just prompt (minimal)',
				params: { prompt: 'a cat playing' },
			},
			{
				name: 'Image + text (i2v)',
				params: { 
					text: 'animate this image',
					image: testImage,
				},
			},
			{
				name: 'Image_b64 + prompt',
				params: { 
					prompt: 'animate',
					image_b64: testImage,
				},
			},
			{
				name: 'Empty (check required fields)',
				params: {},
			},
			{
				name: 'Chutes.ai standard format',
				params: {
					inputs: {
						text: 'a cat',
					},
				},
			},
			{
				name: 'Chutes.ai with image',
				params: {
					inputs: {
						text: 'animate',
						image: testImage,
					},
				},
			},
			{
				name: 'Nested params',
				params: {
					parameters: {
						prompt: 'a cat',
					},
				},
			},
		];

		let foundWorking = false;

		for (const paramSet of parameterSets) {
			console.log(`Testing: ${paramSet.name}`);
			console.log(`Params: ${JSON.stringify(paramSet.params)}`);

			try {
				const response = await fetch(`${CHUTE_URL}/generate`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${API_KEY}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(paramSet.params),
				});

				console.log(`  Status: ${response.status}`);
				
				if (response.status === 200 || response.status === 202) {
					console.log('  ✅ SUCCESS!');
					const contentType = response.headers.get('content-type');
					console.log(`  Content-Type: ${contentType}`);
					
					if (contentType?.includes('video') || contentType?.includes('mp4')) {
						const buffer = await response.arrayBuffer();
						console.log(`  Response: Binary video (${buffer.byteLength} bytes)`);
					} else if (contentType?.includes('json')) {
						const data = await response.json();
						console.log(`  Response: ${JSON.stringify(data, null, 2)}`);
					}

					console.log('\n📝 WORKING CONFIGURATION:');
					console.log(`   Endpoint: ${CHUTE_URL}/generate`);
					console.log(`   Parameters: ${JSON.stringify(paramSet.params, null, 2)}`);
					
					foundWorking = true;
					break;
				} else if (response.status === 400) {
					const error = await response.text();
					console.log(`  ⚠️  Bad Request: ${error.substring(0, 300)}`);
				} else {
					console.log(`  ❓ Status: ${response.status}`);
				}
			} catch (error: any) {
				console.log(`  ❌ Error: ${error.message}`);
			}

			console.log('');
		}

		if (!foundWorking) {
			console.log('⚠️  No working parameter set found!');
			console.log('💡 The chute might require specific input fields not tested yet');
		}

		expect(true).toBe(true);
	}, 60000);

	testOrSkip('should test Chutes.ai Playground format', async () => {
		if (!API_KEY) {
			console.log('⏭️  Skipping - no API key');
			return;
		}

		// Skip if chute doesn't support T2V
		if (CHUTE_NAME && !supportsTextToVideo({ name: CHUTE_NAME })) {
			console.log(`⏭️  Skipping - chute only supports I2V, not T2V`);
			return;
		}

		console.log('\n🎮 Testing Chutes.ai Playground request format...\n');

		// Replicate what the Chutes.ai playground sends
		const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

		const formats = [
			{
				name: 'Format 1: Direct fields',
				body: {
					text: 'a cat',
					image: testImage,
				},
			},
			{
				name: 'Format 2: Inputs object',
				body: {
					inputs: {
						text: 'a cat',
						image: testImage,
					},
				},
			},
			{
				name: 'Format 3: With model info',
				body: {
					model: 'wan-2.2-i2v-14b-fast',
					inputs: {
						text: 'a cat',
						image: testImage,
					},
				},
			},
		];

		for (const format of formats) {
			console.log(`Testing: ${format.name}`);
			console.log(`Body: ${JSON.stringify(format.body, null, 2)}`);

			try {
				const response = await fetch(`${CHUTE_URL}/generate`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${API_KEY}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(format.body),
				});

				console.log(`Status: ${response.status}`);
				
				if (response.ok) {
					console.log('✅ This format works!');
					const contentType = response.headers.get('content-type');
					console.log(`Content-Type: ${contentType}`);
					break;
				} else {
					const error = await response.text();
					console.log(`Error: ${error.substring(0, 200)}`);
				}
			} catch (error: any) {
				console.log(`Error: ${error.message}`);
			}

			console.log('');
		}

		expect(true).toBe(true);
	}, 60000);
});

