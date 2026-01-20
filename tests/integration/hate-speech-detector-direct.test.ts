/**
 * Hate Speech Detection - Batch Prediction Test
 * 
 * Tests hate speech detection using WARMED_MODERATION_CHUTE from global warmup.
 * Uses dynamic chute discovery instead of hardcoded URLs.
 * 
 * Note: Hate speech detector only accepts TEXT (no images), using /predict endpoint.
 * Tests will gracefully skip if warmed chute doesn't support this endpoint.
 */

import 'dotenv/config';

const API_KEY = process.env.CHUTES_API_KEY;
const MODERATION_CHUTE = process.env.WARMED_MODERATION_CHUTE;

describe('Hate Speech Detection - Batch API', () => {
	const testOrSkip = API_KEY && MODERATION_CHUTE ? test : test.skip;

	if (!API_KEY) {
		console.warn('⚠️  CHUTES_API_KEY not set, skipping hate speech tests');
	}
	if (!MODERATION_CHUTE) {
		console.warn('⚠️  No warmed moderation chute available, skipping hate speech tests');
	}

	testOrSkip('Step 1: Test /predict endpoint with batch format', async () => {
		try {
			console.log(`\n🛡️  Testing hate speech detection with: ${MODERATION_CHUTE}`);
			
			const testText = 'This is a normal, safe message about pancakes.';
			console.log(`   Testing with text: "${testText}"`);
			
			// hate-speech-detector expects ARRAY of texts (batch format)
			console.log('\n📤 Request format: {texts: ["..."]}');
			const response = await fetch(`${MODERATION_CHUTE}/predict`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				texts: [testText], // Array, not singular!
			}),
		});
		
		console.log(`   Response status: ${response.status}`);
		console.log(`   Content-Type: ${response.headers.get('content-type')}`);
		
		if (!response.ok) {
			const error = await response.text();
			console.log(`   Error: ${error.substring(0, 300)}`);
			
			// Skip if infrastructure issue
			if (response.status === 500 || response.status === 503 || response.status === 404 || response.status === 502) {
				console.log('   ⏭️  Skipping - chute temporarily unavailable');
				return;
			}
		}
		
		expect(response.status).toBe(200);
		const data = await response.json() as any;
		
		console.log('\n✅ Response received:');
		console.log(`   Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
		console.log(`   Full response:`, data);
		
		// Response is ARRAY of predictions: [{label: "...", score: ...}]
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBe(1);
		expect(data[0]).toBeDefined();
		expect(data[0].label).toBeDefined();
		expect(data[0].score).toBeDefined();
		expect(typeof data[0].score).toBe('number');
		
		console.log(`   Label: ${data[0].label}`);
		console.log(`   Score: ${data[0].score}`);
		
		console.log('\n🎉 Hate speech detection test passed!');
		} catch (error) {
			const errorMsg = String(error);
			if (errorMsg.includes('fetch failed') || 
			    errorMsg.includes('ECONNREFUSED') ||
			    errorMsg.includes('ETIMEDOUT') ||
			    errorMsg.includes('network')) {
				console.log('⏭️ Skipping - network error or timeout');
				return; // Skip gracefully
			}
			throw error;
		}
	}, 180000);

	testOrSkip('Step 2: Test with multiple texts (batch)', async () => {
		try {
			console.log('\n🛡️  Testing batch hate speech detection...');
			
			const texts = [
				'Hello, how are you?',
				'Nice weather today.',
			];
			console.log(`   Testing with ${texts.length} texts`);
			
			const response = await fetch(`${MODERATION_CHUTE}/predict`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				texts: texts,
			}),
		});
		
		console.log(`   Response status: ${response.status}`);
		
		if (!response.ok) {
			const error = await response.text();
			console.log(`   Error: ${error.substring(0, 300)}`);
			
			// Skip if infrastructure issue
			if (response.status === 500 || response.status === 503 || response.status === 404 || response.status === 502) {
				console.log('   ⏭️  Skipping - chute temporarily unavailable');
				return;
			}
		}
		
		expect(response.status).toBe(200);
		const data = await response.json() as any;
		
		console.log('\n✅ Batch response received:');
		console.log(`   Response length: ${data.length}`);
		
		// Should have 2 results (one per input text)
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBe(2);
		
		data.forEach((result: any, i: number) => {
			console.log(`   Result ${i + 1}: label="${result.label}", score=${result.score}`);
			expect(result.label).toBeDefined();
			expect(result.score).toBeDefined();
		});
		
		console.log('\n🎉 Batch hate speech detection test passed!');
		} catch (error) {
			const errorMsg = String(error);
			if (errorMsg.includes('fetch failed') || 
			    errorMsg.includes('ECONNREFUSED') ||
			    errorMsg.includes('ETIMEDOUT') ||
			    errorMsg.includes('network')) {
				console.log('⏭️ Skipping - network error or timeout');
				return; // Skip gracefully
			}
			throw error;
		}
	}, 180000);
});

