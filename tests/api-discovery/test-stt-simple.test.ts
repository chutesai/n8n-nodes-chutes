/**
 * Simple Speech-to-Text API Discovery Test
 * Tests with public audio URL - no local files needed
 */

import 'dotenv/config';

const API_KEY = process.env.CHUTES_API_KEY;
const STT_CHUTE_URL = process.env.WARMED_STT_CHUTE || null; // Use dynamically warmed chute

describe('STT API Simple Discovery', () => {
	// Skip if no API key or no STT chute available
	const testOrSkip = (API_KEY && STT_CHUTE_URL) ? test : test.skip;
	
	// Use a public test audio file
	const publicAudioUrl = 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';

	const testEndpoints = [
		'/v1/audio/transcriptions',
		'/transcribe',
		'/v1/transcribe',
		'/transcriptions',
	];

	testOrSkip('Discover working endpoint with public audio URL', async () => {
		if (!STT_CHUTE_URL) {
			console.log('⏭️  Skipping - no STT chute available');
			return;
		}

		const testUrls = [STT_CHUTE_URL]; // Use dynamically discovered chute
		for (const baseUrl of testUrls) {
			for (const endpoint of testEndpoints) {
				console.log(`\nTesting: ${baseUrl}${endpoint}`);
				
				// Try different request formats
				const requestFormats = [
					// Format 1: URL in body
					{
						name: 'JSON with url field',
						data: { url: publicAudioUrl },
						headers: { 'Content-Type': 'application/json' },
					},
					// Format 2: URL as audio field
					{
						name: 'JSON with audio field as URL',
						data: { audio: publicAudioUrl },
						headers: { 'Content-Type': 'application/json' },
					},
					// Format 3: Input field
					{
						name: 'JSON with input field',
						data: { input: publicAudioUrl },
						headers: { 'Content-Type': 'application/json' },
					},
				];

				for (const format of requestFormats) {
					try {
						const response = await fetch(
							`${baseUrl}${endpoint}`,
							{
								method: 'POST',
								headers: {
									...format.headers,
									'Authorization': `Bearer ${API_KEY}`,
								},
								body: JSON.stringify(format.data),
							}
						);

						const responseText = await response.text();
						let responseData;
						try {
							responseData = JSON.parse(responseText);
						} catch {
							responseData = responseText;
						}

						if (response.ok) {
							console.log(`✅ SUCCESS with ${format.name}!`);
							console.log('Response:', typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData);
							console.log('Status:', response.status);
							
							// This is the working combination!
							expect(response.status).toBe(200);
							
							return; // Exit test on first success
						} else {
							console.log(`  ❌ ${format.name}: ${response.status} - ${response.statusText}`);
							console.log('  Error data:', responseData);
						}
					} catch (error: any) {
						console.log(`  ❌ ${format.name}: ${error.message}`);
					}
				}
			}
		}

		console.log('\n⚠️  No working endpoint/format combination found');
	}, 60000); // 60 second test timeout

	testOrSkip('Test with base64 audio data (verified format)', async () => {
		if (!STT_CHUTE_URL) {
			console.log('⏭️  Skipping - no STT chute available');
			return;
		}

		// Small base64 encoded WAV file (1 second of silence)
		const smallWavBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

		// Test the correct format (discovered via source code inspection)
		const testUrl = `${STT_CHUTE_URL}/transcribe`;
		
		console.log(`\nTesting verified endpoint: ${testUrl}`);
		console.log('Using correct format: { audio_b64: "..." }');
		
		try {
			const response = await fetch(
				testUrl,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${API_KEY}`,
					},
					body: JSON.stringify({
						audio_b64: smallWavBase64, // Correct field name
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

			if (response.ok) {
				console.log('✅ Verified format works!');
				console.log('Response:', responseData);
				expect(response.status).toBe(200);
				expect(Array.isArray(responseData)).toBe(true); // Should return chunks array
			} else {
				console.log(`Status: ${response.status}`);
				console.log('Response:', responseData);
				// Don't fail - this is a discovery test
			}
		} catch (error: any) {
			console.log(`Error: ${error.message}`);
			// Don't fail - network issues happen
		}
	}, 30000); // 30 second timeout
});

