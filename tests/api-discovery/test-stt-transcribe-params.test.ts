/**
 * Discover the correct parameter format for /transcribe endpoint
 * We know the endpoint exists (got 400, not 404), just need the right params
 */

import 'dotenv/config';

const API_KEY = process.env.CHUTES_API_KEY;
const STT_CHUTE_URL = process.env.WARMED_STT_CHUTE || null; // Use dynamically warmed chute

describe('STT /transcribe Parameter Discovery', () => {
	// Skip if no API key or no STT chute available
	const testOrSkip = (API_KEY && STT_CHUTE_URL) ? test : test.skip;
	
	testOrSkip('Discover correct parameter format', async () => {
		if (!STT_CHUTE_URL) {
			console.log('⏭️  Skipping - no STT chute available');
			return;
		}
		
		const WHISPER_CHUTE_URL = `${STT_CHUTE_URL}/transcribe`;
		if (!API_KEY) {
			console.log('Skipping - no API key');
			return;
		}

		// Small base64 encoded WAV file (1 second of silence)
		const smallWavBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
		const publicAudioUrl = 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';

		const parameterCombinations = [
			// Try different field names for audio data
			{ name: 'file as base64', data: { file: smallWavBase64 } },
			{ name: 'audio as base64', data: { audio: smallWavBase64 } },
			{ name: 'data as base64', data: { data: smallWavBase64 } },
			{ name: 'input as base64', data: { input: smallWavBase64 } },
			{ name: 'base64 as base64', data: { base64: smallWavBase64 } },
			
			// Try with URL
			{ name: 'file as URL', data: { file: publicAudioUrl } },
			{ name: 'audio as URL', data: { audio: publicAudioUrl } },
			{ name: 'url as URL', data: { url: publicAudioUrl } },
			{ name: 'audio_url', data: { audio_url: publicAudioUrl } },
			
			// Try with explicit format
			{ name: 'audio + format', data: { audio: smallWavBase64, format: 'wav' } },
			{ name: 'file + format', data: { file: smallWavBase64, format: 'wav' } },
			{ name: 'data + encoding', data: { data: smallWavBase64, encoding: 'base64' } },
			
			// Try with language parameter
			{ name: 'audio + language', data: { audio: smallWavBase64, language: 'en' } },
			
			// Try OpenAI-style with task
			{ name: 'file + model', data: { file: smallWavBase64, model: 'whisper-large-v3' } },
			{ name: 'file + task', data: { file: smallWavBase64, task: 'transcribe' } },
			
			// Try minimal
			{ name: 'just audio', data: { audio: smallWavBase64 } },
			{ name: 'just file', data: { file: smallWavBase64 } },
		];

		console.log(`\nTesting ${WHISPER_CHUTE_URL}\n`);

		for (const combination of parameterCombinations) {
			try {
				const response = await fetch(WHISPER_CHUTE_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${API_KEY}`,
					},
					body: JSON.stringify(combination.data),
				});

				const responseText = await response.text();
				let responseData;
				try {
					responseData = JSON.parse(responseText);
				} catch {
					responseData = responseText;
				}

				if (response.ok) {
					console.log(`\n✅ SUCCESS with "${combination.name}"!`);
					console.log('Request body:', JSON.stringify(combination.data, null, 2));
					console.log('Response:', typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData);
					console.log('\n🎉 FOUND THE WORKING PARAMETER FORMAT! 🎉\n');
					
					// Found it!
					expect(response.status).toBe(200);
					return;
				} else {
					// Only log non-400 errors (400 = wrong params, which we expect)
					if (response.status !== 400) {
						console.log(`  ⚠️  ${combination.name}: ${response.status} - ${response.statusText}`);
						console.log('  Response:', responseData);
					}
				}
			} catch (error: any) {
				console.log(`  ❌ ${combination.name}: ${error.message}`);
			}
		}

		console.log('\n⚠️  None of the parameter combinations worked');
		console.log('💡 The API might require multipart/form-data instead of JSON');
		console.log('💡 Or it might need actual audio file binary data, not base64');
	}, 60000);

	testOrSkip('Try with different content types', async () => {
		if (!STT_CHUTE_URL) {
			console.log('⏭️  Skipping - no STT chute available');
			return;
		}
		
		const WHISPER_CHUTE_URL = `${STT_CHUTE_URL}/transcribe`;

		const smallWavBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

		const contentTypes = [
			{ name: 'application/json', type: 'application/json', body: JSON.stringify({ audio: smallWavBase64 }) },
			{ name: 'audio/wav', type: 'audio/wav', body: Buffer.from(smallWavBase64, 'base64') },
			{ name: 'audio/mpeg', type: 'audio/mpeg', body: Buffer.from(smallWavBase64, 'base64') },
			{ name: 'multipart/form-data', type: 'multipart/form-data', body: JSON.stringify({ file: smallWavBase64 }) },
		];

		console.log('\nTrying different content types...\n');

		for (const ct of contentTypes) {
			try {
				const response = await fetch(WHISPER_CHUTE_URL, {
					method: 'POST',
					headers: {
						'Content-Type': ct.type,
						'Authorization': `Bearer ${API_KEY}`,
					},
					body: ct.body,
				});

				const responseText = await response.text();
				
				if (response.ok) {
					console.log(`✅ SUCCESS with ${ct.name}!`);
					console.log('Response:', responseText);
					return;
				} else if (response.status !== 400) {
					console.log(`  ⚠️  ${ct.name}: ${response.status}`);
				}
			} catch (error: any) {
				console.log(`  ❌ ${ct.name}: ${error.message}`);
			}
		}
	}, 30000); // 30 second timeout
});

