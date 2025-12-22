/**
 * TDD Test: Discover if we can get metadata about specific chutes
 * Including available speakers/voices for TTS chutes
 */

import * as dotenv from 'dotenv';

dotenv.config();

describe('🔍 Chute Metadata Discovery', () => {
	const API_KEY = process.env.CHUTES_API_KEY;
	const TTS_CHUTE_URL = process.env.WARMED_TTS_CHUTE || null; // Use dynamically warmed chute
	const MAIN_API = 'https://api.chutes.ai';
	
	// Skip if no API key or no TTS chute available
	const testOrSkip = (API_KEY && TTS_CHUTE_URL) ? test : test.skip;
	
	beforeAll(() => {
		if (!API_KEY) {
			throw new Error('CHUTES_API_KEY not set in environment');
		}
	});

	testOrSkip('Try to get chute info from main API', async () => {
		if (!API_KEY) {
			console.log('⏭️  Skipping - no API key available');
			return;
		}
		console.log('\n🔍 Testing main API for chute information...\n');

		const endpoints = [
			'/v1/chutes',
			'/chutes',
			'/models',
			'/v1/models',
			'/chutes/kokoro',
			'/chutes/csm-1b',
		];

		for (const endpoint of endpoints) {
			try {
				console.log(`Testing: GET ${MAIN_API}${endpoint}`);
				
				const response = await fetch(
					`${MAIN_API}${endpoint}`,
					{
						method: 'GET',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
						},
					}
				);

				if (response.status === 200) {
					const data = await response.json() as any;
					console.log(`✅ SUCCESS: ${endpoint}`);
					console.log(`   Data keys:`, Object.keys(data).slice(0, 5));
					
					// Look for speaker-related fields
					const dataStr = JSON.stringify(data);
					if (dataStr.includes('speaker') || dataStr.includes('voice')) {
						console.log('   🎤 Contains speaker/voice information!');
						console.log('   Sample:', JSON.stringify(data, null, 2).slice(0, 500));
					}
				} else {
					console.log(`❌ FAILED: ${endpoint} returned ${response.status}`);
				}
			} catch (error: any) {
				console.log(`❌ ERROR: ${endpoint} - ${error.message}`);
			}
		}
	}, 60000);

	testOrSkip('Try to get metadata from chute-specific endpoints', async () => {
		if (!TTS_CHUTE_URL) {
			console.log('⏭️  Skipping - no TTS chute available');
			return;
		}
		
		console.log('\n🔍 Testing chute-specific metadata endpoints...\n');

		const chutes = [
			{ name: 'TTS Chute', url: TTS_CHUTE_URL },
		];

		const endpoints = [
			'/info',
			'/metadata',
			'/config',
			'/',
			'/health',
			'/docs',
			'/openapi.json',
		];

		for (const chute of chutes) {
			console.log(`\n📋 Testing ${chute.name}...`);
			
			for (const endpoint of endpoints) {
				try {
					const response = await fetch(
						`${chute.url}${endpoint}`,
						{
							method: 'GET',
							headers: {
								'Authorization': `Bearer ${API_KEY}`,
							},
						}
					);

					if (response.status === 200) {
						const contentType = response.headers.get('content-type');
						console.log(`   ✅ ${endpoint} returned 200 (${contentType})`);
						
						if (contentType?.includes('json')) {
							const data = await response.json() as any;
							const dataStr = JSON.stringify(data);
							
							if (dataStr.includes('speaker') || dataStr.includes('voice')) {
								console.log('      🎤 Contains speaker/voice information!');
								console.log('      Data:', JSON.stringify(data, null, 2).slice(0, 500));
							}
						} else if (contentType?.includes('html')) {
							const html = await response.text();
							if (html.includes('speaker') || html.includes('voice')) {
								console.log('      🎤 HTML docs might contain speaker info');
							}
						}
					}
				} catch (error: any) {
					// Silently skip errors
				}
			}
		}
	}, 60000);

	testOrSkip('Check if OpenAPI/Swagger docs reveal speaker options', async () => {
		if (!TTS_CHUTE_URL) {
			console.log('⏭️  Skipping - no TTS chute available');
			return;
		}
		
		console.log('\n🔍 Checking for OpenAPI/Swagger documentation...\n');

		const chutes = [
			{ name: 'TTS Chute', url: TTS_CHUTE_URL },
		];

		for (const chute of chutes) {
			console.log(`\n📋 ${chute.name}:`);
			
			try {
				const response = await fetch(`${chute.url}/openapi.json`);
				
				if (response.status === 200) {
					const openapi = await response.json() as any;
					console.log(`   ✅ OpenAPI docs available!`);
					
					// Look for /speak endpoint definition
					if (openapi.paths && openapi.paths['/speak']) {
						console.log('   📝 /speak endpoint found:');
						const speakDef = openapi.paths['/speak'];
						console.log(JSON.stringify(speakDef, null, 2).slice(0, 1000));
						
						// Look for speaker parameter schema
						if (speakDef.post?.requestBody?.content?.['application/json']?.schema) {
							const schema = speakDef.post.requestBody.content['application/json'].schema;
							console.log('\n   📄 Request schema:', JSON.stringify(schema, null, 2));
						}
					}
				}
			} catch (error: any) {
				console.log(`   ❌ No OpenAPI docs available`);
			}
		}
	}, 60000);

	testOrSkip('Test /speak endpoint with different speaker values to see which ones work', async () => {
		if (!TTS_CHUTE_URL) {
			console.log('⏭️  Skipping - no TTS chute available');
			return;
		}
		
		console.log('\n🔍 Testing which speaker values work for each chute...\n');

		const testCases = [
			{ chute: 'TTS Chute', url: TTS_CHUTE_URL, speakers: ['0', '1', 'af_bella', 'af', 'default'] },
		];

		for (const test of testCases) {
			console.log(`\n📋 ${test.chute}:`);
			
			for (const speaker of test.speakers) {
				try {
					const response = await fetch(
						`${test.url}/speak`,
						{
							method: 'POST',
							headers: {
								'Authorization': `Bearer ${API_KEY}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								text: 'Test',
								speaker: speaker,
							}),
						}
					);

					if (response.status === 200) {
						console.log(`   ✅ speaker="${speaker}" works`);
					} else {
						const errorText = await response.text();
						console.log(`   ❌ speaker="${speaker}" failed: ${response.status} - ${errorText.slice(0, 100)}`);
					}
				} catch (error: any) {
					console.log(`   ❌ speaker="${speaker}" error: ${error.message}`);
				}
			}
		}
	}, 180000);
});

