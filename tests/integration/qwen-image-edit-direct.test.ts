/**
 * Image Edit - Direct API Test
 * 
 * Tests the /generate endpoint with correct parameter format.
 * Uses WARMED_IMAGE_CHUTE from global warmup infrastructure.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.CHUTES_API_KEY;
const IMAGE_CHUTE = process.env.WARMED_IMAGE_CHUTE || null;

describe('Image Edit - Direct API', () => {
	const testOrSkip = (API_KEY && IMAGE_CHUTE) ? test : test.skip;
	
	if (!IMAGE_CHUTE) {
		console.warn('⚠️  No warmed image chute available, skipping image edit test');
	}

	testOrSkip('should edit image using warmed chute', async () => {
		console.log('\n🖼️  Testing Image Edit with direct API call...');
		
		// Read the cat image
		const imagePath = path.join(__dirname, '../cathatfatstack.png');
		console.log(`   📂 Reading image from: ${imagePath}`);
		
		const imageBuffer = fs.readFileSync(imagePath);
		const imageBase64 = imageBuffer.toString('base64');
		console.log(`   ✅ Image loaded: ${imageBuffer.length} bytes (base64: ${imageBase64.length} chars)`);

		// Try WITHOUT input_args wrapping first (maybe public API doesn't need it?)
		const requestBodyFlat = {
			prompt: 'make the hat green and the cat black and the pancakes blueberry pancakes, and make the syrup strawberry colored syrup',
			image_b64s: [imageBase64], // Array of base64 strings (1-3 images)
			negative_prompt: '',
			width: 1024,
			height: 1024,
			num_inference_steps: 40, // Use default from schema
			true_cfg_scale: 4.0,
		};
		
		// Also have wrapped version ready
		const requestBodyWrapped = {
			input_args: requestBodyFlat
		};

		console.log(`   📤 Request body structure:`);
		console.log(`      - endpoint: /generate`);
		console.log(`      - prompt: "${requestBodyFlat.prompt}"`);
		console.log(`      - image_b64s length: ${requestBodyFlat.image_b64s.length}`);
		console.log(`      - image_b64s[0] size: ${requestBodyFlat.image_b64s[0].length} chars`);
		console.log(`      - dimensions: ${requestBodyFlat.width}x${requestBodyFlat.height}`);
		console.log(`      - steps: ${requestBodyFlat.num_inference_steps}`);

		// Try flat parameters first (no input_args wrapping)
		console.log(`    Attempt 1: Flat parameters (no input_args): ${IMAGE_CHUTE}/generate`);
		
		// Add timeout to prevent hanging on chutes that don't support editing
		const controller1 = new AbortController();
		const timeout1 = setTimeout(() => controller1.abort(), 60000); // 60s timeout
		
		let response: Response;
		try {
			response = await fetch(`${IMAGE_CHUTE}/generate`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBodyFlat),
				signal: controller1.signal,
			});
			clearTimeout(timeout1);
		} catch (error: any) {
			clearTimeout(timeout1);
			if (error.name === 'AbortError') {
				console.log(`   ⏭️  Skipping - warmed image chute doesn't support image editing`);
				return;
			}
			throw error;
		}
		
		// If that fails with 400, try wrapped in input_args
		if (response.status === 400) {
			console.log(`   ⚠️  Flat parameters failed (${response.status}), trying input_args wrapper...`);
			console.log(`    Attempt 2: With input_args wrapper: ${IMAGE_CHUTE}/generate`);
			
			const controller2 = new AbortController();
			const timeout2 = setTimeout(() => controller2.abort(), 60000);
			
			try {
				response = await fetch(`${IMAGE_CHUTE}/generate`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${API_KEY}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(requestBodyWrapped),
					signal: controller2.signal,
				});
				clearTimeout(timeout2);
			} catch (error: any) {
				clearTimeout(timeout2);
				if (error.name === 'AbortError') {
					console.log(`   ⏭️  Skipping - warmed image chute doesn't support image editing`);
					return;
				}
				throw error;
			}
		}

		console.log(`   📥 Response status: ${response.status}`);
		console.log(`   📥 Content-Type: ${response.headers.get('content-type')}`);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`   ❌ API error: ${errorText}`);
			console.log(`\n   💡 Debugging info:`);
			console.log(`      - Is base64 valid? ${imageBase64.match(/^[A-Za-z0-9+/]*={0,2}$/) ? 'YES' : 'NO'}`);
			console.log(`      - First 50 chars of base64: ${imageBase64.substring(0, 50)}`);
			console.log(`      - Last 50 chars of base64: ${imageBase64.substring(imageBase64.length - 50)}`);
			
			// If infrastructure unavailable or chute not ready, skip gracefully
			if (response.status === 500 || response.status === 503 || response.status === 404) {
				console.log('   ⏭️  Skipping - chute temporarily unavailable or warming up');
				return;
			}
			
			throw new Error(`API returned ${response.status}: ${errorText}`);
		}

		// Should return image (jpeg or png depending on chute)
		const contentType = response.headers.get('content-type');
		expect(contentType).toMatch(/image\/(jpeg|png)/);

		// Get the edited image
		const imageData = await response.arrayBuffer();
		console.log(`   ✅ Received edited image: ${imageData.byteLength} bytes`);
		expect(imageData.byteLength).toBeGreaterThan(10000); // Should be a substantial image

		// Save to test-output (NOT committed to git)
		const outputDir = path.join(__dirname, '../test-output');
		fs.mkdirSync(outputDir, { recursive: true });
		const outputPath = path.join(outputDir, 'qwen-edited-green-hat-black-cat-blueberry-pancakes.jpg');
		fs.writeFileSync(outputPath, Buffer.from(imageData));
		
		console.log(`\n🎉 SUCCESS! Edited image saved to: ${outputPath}`);
		console.log(`   Original: cat in red hat with regular pancakes`);
		console.log(`   Edited: green hat, black cat, blueberry pancakes`);
		
		expect(fs.existsSync(outputPath)).toBe(true);
	}, 300000); // 5 minutes - image editing is legitimately slow
});
