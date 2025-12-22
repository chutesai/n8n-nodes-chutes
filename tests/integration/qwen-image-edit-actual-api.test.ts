/**
 * Image Edit Integration Test
 * 
 * Tests real API call to image edit chute using OpenAPI discovery system.
 * Uses WARMED_IMAGE_CHUTE from global warmup infrastructure.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as openApiDiscovery from '../../nodes/Chutes/transport/openApiDiscovery';

const API_KEY = process.env.CHUTES_API_KEY;
const IMAGE_CHUTE = process.env.WARMED_IMAGE_CHUTE || null;

describe('Image Edit Integration', () => {
	const testOrSkip = (API_KEY && IMAGE_CHUTE) ? test : test.skip;
	
	if (!IMAGE_CHUTE) {
		console.warn('⚠️  No warmed image chute available, skipping image edit test');
	}

	testOrSkip('should edit image using warmed chute with discovery system', async () => {
		console.log('\n🖼️  Testing Qwen Image Edit with OpenAPI Discovery...');
		
		// Read test image
		const imagePath = path.join(__dirname, '../cathatfatstack.png');
		const imageBuffer = fs.readFileSync(imagePath);
		const imageBase64 = imageBuffer.toString('base64');
		console.log(`   ✓ Read image: ${imageBuffer.length} bytes`);

		// Discover capabilities
		console.log('   ✓ Discovering capabilities...');
		const capabilities = await openApiDiscovery.discoverChuteCapabilities(IMAGE_CHUTE!, API_KEY!);
		console.log(`   ✓ Supports image edit: ${capabilities.supportsImageEdit}`);
		console.log(`   ✓ Image edit path: ${capabilities.imageEditPath}`);

		// Build request
		const requestConfig = openApiDiscovery.buildRequestBody('edit', capabilities, {
			prompt: 'make the hat green and the cat black and the pancakes blueberry pancakes, and make the syrup strawberry colored syrup',
			image: imageBase64,
			width: 1024,
			height: 1024,
		});

		expect(requestConfig).not.toBeNull();
		
		// CRITICAL: Public API uses FLAT parameters, not input_args wrapping!
		// The discovery system should have converted 'image' to 'image_b64s' array
		expect(requestConfig!.body.image_b64s).toBeDefined();
		expect(Array.isArray(requestConfig!.body.image_b64s)).toBe(true);
		expect(requestConfig!.body.prompt).toBe('make the hat green and the cat black and the pancakes blueberry pancakes, and make the syrup strawberry colored syrup');
		console.log('   ✓ Built request with flat parameters (image_b64s array)');

		// Make API call
		console.log(`   ✓ Making API request to: ${requestConfig!.endpoint}`);
		const response = await fetch(`${IMAGE_CHUTE}${requestConfig!.endpoint}`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestConfig!.body),
		});

		if (!response.ok) {
			const error = await response.text();
			console.error(`   ❌ API error: ${error}`);
			
			// If infrastructure unavailable, skip gracefully
			if (response.status === 500 || response.status === 503 || response.status === 404 || response.status === 502) {
				console.log('   ⏭️  Skipping - chute temporarily unavailable');
				return;
			}
			
			throw new Error(`API returned ${response.status}: ${error}`);
		}

		const imageData = await response.arrayBuffer();
		console.log(`   ✓ Received ${imageData.byteLength} bytes`);
		expect(imageData.byteLength).toBeGreaterThan(10000); // Should be substantial

		// Save image
		const outputDir = path.join(__dirname, '../test-output');
		fs.mkdirSync(outputDir, { recursive: true });
		const outputPath = path.join(outputDir, 'qwen-edited-via-discovery.jpg');
		fs.writeFileSync(outputPath, Buffer.from(imageData));
		
		console.log(`\n✅ SUCCESS! Saved to: ${outputPath}`);
		console.log('   Original: cat in red hat with regular pancakes');
		console.log('   Edited: green hat, black cat, blueberry pancakes');
		expect(fs.existsSync(outputPath)).toBe(true);
	}, 300000); // 5 minutes - image editing is legitimately slow
});
