/**
 * Discover the correct endpoint for Text-to-Speech chutes
 * 
 * The error "No matching cord found!" means the endpoint doesn't exist.
 * Let's test common TTS endpoint patterns to find the right one.
 */

import * as dotenv from 'dotenv';

dotenv.config();

describe('🔍 Text-to-Speech Endpoint Discovery', () => {
	const API_KEY = process.env.CHUTES_API_KEY;
	const TTS_CHUTE_URL = process.env.WARMED_TTS_CHUTE || null; // Use dynamically warmed chute
	
	// Skip if no API key or no TTS chute available
	const testOrSkip = (API_KEY && TTS_CHUTE_URL) ? test : test.skip;
	
	// Common TTS endpoint patterns
	const ENDPOINTS_TO_TEST = [
		'/generate',
		'/speak',
		'/robust_speak',
		'/synthesize',
		'/tts',
		'/generate_speech',
		'/text_to_speech',
		'/audio',
		'/v1/audio/speech', // OpenAI-compatible
	];

	const testText = 'Hello, this is a test.';

	beforeAll(() => {
		if (!API_KEY) {
			throw new Error('CHUTES_API_KEY not set in environment');
		}
	});

	testOrSkip('Try each endpoint to find which one works', async () => {
		if (!TTS_CHUTE_URL) {
			console.log('⏭️  Skipping - no TTS chute available');
			return;
		}
		console.log('\n🔍 Testing TTS endpoints...\n');
		
		const results: { endpoint: string; status: number; error?: string; success?: boolean }[] = [];

		for (const endpoint of ENDPOINTS_TO_TEST) {
			try {
				console.log(`Testing: ${endpoint}`);
				
				const response = await fetch(
					`${TTS_CHUTE_URL}${endpoint}`,
					{
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							input: testText,
							text: testText,
						}),
					}
				);

				const responseText = await response.text();
				let responseData;
				try {
					responseData = JSON.parse(responseText);
				} catch {
					responseData = responseText;
				}

				results.push({
					endpoint,
					status: response.status,
					success: response.status === 200,
				});

				if (response.status === 200) {
					console.log(`✅ SUCCESS: ${endpoint} returned 200`);
					console.log(`   Response type: ${response.headers.get('content-type')}`);
					console.log(`   Response size: ${responseText.length} bytes`);
				} else {
					console.log(`❌ FAILED: ${endpoint} returned ${response.status}`);
					if (responseData?.detail) {
						console.log(`   Error: ${responseData.detail}`);
					}
				}
			} catch (error: any) {
				results.push({
					endpoint,
					status: 0,
					error: error.message,
				});
				console.log(`❌ ERROR: ${endpoint} - ${error.message}`);
			}
		}

		// Summary
		console.log('\n📊 SUMMARY:\n');
		const successful = results.filter(r => r.success);
		const failed = results.filter(r => !r.success);

		if (successful.length > 0) {
			console.log('✅ Working endpoints:');
			successful.forEach(r => console.log(`   ${r.endpoint} (${r.status})`));
		}

		if (failed.length > 0) {
			console.log('\n❌ Failed endpoints:');
			failed.forEach(r => console.log(`   ${r.endpoint} (${r.status}${r.error ? `: ${r.error}` : ''})`));
		}

		// The test passes if we found at least one working endpoint
		expect(successful.length).toBeGreaterThan(0);
		
		console.log(`\n🎯 RECOMMENDATION: Use endpoint "${successful[0].endpoint}"`);
	}, 180000); // 3 minute timeout

	testOrSkip('Try with different request body formats on /speak endpoint', async () => {
		if (!TTS_CHUTE_URL) {
			console.log('⏭️  Skipping - no TTS chute available');
			return;
		}
		console.log('\n🔍 Testing different request body formats on /speak...\n');

		const bodyFormats = [
			{ name: 'input field', body: { input: testText } },
			{ name: 'text field', body: { text: testText } },
			{ name: 'message field', body: { message: testText } },
			{ name: 'prompt field', body: { prompt: testText } },
		];

		for (const format of bodyFormats) {
			try {
				console.log(`Testing body format: ${format.name}`);
				
				const response = await fetch(
					`${TTS_CHUTE_URL}/speak`, // Use the working endpoint
					{
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(format.body),
					}
				);

				const responseText = await response.text();
				let responseData;
				try {
					responseData = JSON.parse(responseText);
				} catch {
					responseData = responseText;
				}

				if (response.status === 200) {
					console.log(`✅ SUCCESS with ${format.name}`);
					console.log(`   Audio size: ${responseText.length} bytes`);
				} else {
					console.log(`❌ FAILED with ${format.name}: ${response.status}`);
					if (responseData?.detail) {
						console.log(`   Error: ${responseData.detail}`);
					}
				}
			} catch (error: any) {
			console.log(`❌ ERROR with ${format.name}: ${error.message}`);
		}
	}
}, 180000); // 3 minutes - tests multiple body format variations
});

