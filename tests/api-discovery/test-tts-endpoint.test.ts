/**
 * Discover the correct endpoint for Text-to-Speech chutes
 * 
 * The error "No matching cord found!" means the endpoint doesn't exist.
 * Let's test common TTS endpoint patterns to find the right one.
 */

import * as dotenv from 'dotenv';

dotenv.config();

interface CatalogChute {
	slug?: string;
	name?: string;
	standard_template?: string;
	description?: string;
	tagline?: string;
}

function toChuteUrl(slug: string): string {
	return `https://${slug}.chutes.ai`;
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function discoverTtsChuteCandidates(apiKey: string, limit = 5): Promise<string[]> {
	const warmed = process.env.WARMED_TTS_CHUTE;
	const candidates: string[] = [];
	if (warmed) {
		candidates.push(warmed.replace(/\/$/, ''));
	}

	const response = await fetch('https://api.chutes.ai/chutes/?include_public=true&limit=500', {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	});
	if (!response.ok) {
		throw new Error(`Failed to discover TTS chute candidates: HTTP ${response.status}`);
	}

	const payload = (await response.json()) as { items?: CatalogChute[] };
	const discovered = (payload.items || [])
		.filter((chute) => {
			const template = String(chute.standard_template || '').toLowerCase();
			const name = String(chute.name || '').toLowerCase();
			const description = String(chute.description || '').toLowerCase();
			const tagline = String(chute.tagline || '').toLowerCase();
			return (
				template === 'tts' ||
				template === 'kokoro' ||
				name.includes('tts') ||
				name.includes('text-to-speech') ||
				name.includes('speech synthesis') ||
				name.includes('kokoro') ||
				description.includes('text-to-speech') ||
				description.includes('speech synthesis') ||
				tagline.includes('text-to-speech')
			);
		})
		.map((chute) => String(chute.slug || '').trim())
		.filter((slug) => slug.length > 0)
		.map((slug) => toChuteUrl(slug))
		.slice(0, limit);

	for (const chuteUrl of discovered) {
		if (!candidates.includes(chuteUrl)) {
			candidates.push(chuteUrl);
		}
	}

	return candidates.slice(0, limit);
}

describe('🔍 Text-to-Speech Endpoint Discovery', () => {
	const API_KEY = process.env.CHUTES_API_KEY;
	const testOrSkip = API_KEY ? test : test.skip;

	const ENDPOINTS_TO_TEST = ['/speak', '/v1/audio/speech', '/generate', '/tts'];
	const testText = 'Hello, this is a test.';

	beforeAll(() => {
		if (!API_KEY) {
			throw new Error('CHUTES_API_KEY not set in environment');
		}
	});

	testOrSkip('Try each endpoint to find which one works', async () => {
		console.log('\n🔍 Testing TTS endpoints...\n');
		const chuteCandidates = await discoverTtsChuteCandidates(API_KEY as string);
		expect(chuteCandidates.length).toBeGreaterThan(0);
		console.log(`Candidate chutes: ${chuteCandidates.join(', ')}`);

		const results: { chuteUrl: string; endpoint: string; status: number; error?: string; success?: boolean }[] = [];
		let foundSuccess = false;

		for (const chuteUrl of chuteCandidates) {
			for (const endpoint of ENDPOINTS_TO_TEST) {
				try {
					console.log(`Testing: ${chuteUrl}${endpoint}`);
					let finalStatus = 0;
					let responseData: any = null;
					for (let attempt = 1; attempt <= 3; attempt++) {
						const response = await fetch(`${chuteUrl}${endpoint}`, {
							method: 'POST',
							headers: {
								Authorization: `Bearer ${API_KEY}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								input: testText,
								text: testText,
							}),
						});
						finalStatus = response.status;
						const responseText = await response.text();
						try {
							responseData = JSON.parse(responseText);
						} catch {
							responseData = responseText;
						}
						if (finalStatus === 200) {
							break;
						}
						if (![429, 502, 503, 504].includes(finalStatus) || attempt === 3) {
							break;
						}
						await sleep(1500 * attempt);
					}

					const success = finalStatus === 200;
					results.push({
						chuteUrl,
						endpoint,
						status: finalStatus,
						success,
					});

					if (success) {
						console.log(`✅ SUCCESS: ${chuteUrl}${endpoint} returned 200`);
						foundSuccess = true;
						break;
					}

					console.log(`❌ FAILED: ${chuteUrl}${endpoint} returned ${finalStatus}`);
					if (responseData?.detail) {
						console.log(`   Error: ${responseData.detail}`);
					}
				} catch (error: any) {
					results.push({
						chuteUrl,
						endpoint,
						status: 0,
						error: error.message,
					});
					console.log(`❌ ERROR: ${chuteUrl}${endpoint} - ${error.message}`);
				}
			}
			if (foundSuccess) {
				break;
			}
		}

		console.log('\n📊 SUMMARY:\n');
		const successful = results.filter((r) => r.success);
		const failed = results.filter((r) => !r.success);

		if (successful.length > 0) {
			console.log('✅ Working endpoints:');
			successful.forEach((r) => console.log(`   ${r.chuteUrl}${r.endpoint} (${r.status})`));
		}
		if (failed.length > 0) {
			console.log('\n❌ Failed endpoints:');
			failed.forEach((r) =>
				console.log(`   ${r.chuteUrl}${r.endpoint} (${r.status}${r.error ? `: ${r.error}` : ''})`),
			);
		}

		if (successful.length === 0) {
			console.log('\n🔁 No success yet, running focused recovery probe on /speak...');
			for (const chuteUrl of chuteCandidates) {
				for (let retry = 1; retry <= 3; retry++) {
					await sleep(2000 * retry);
					const probe = await fetch(`${chuteUrl}/speak`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ text: testText }),
					});
					if (probe.status === 200) {
						successful.push({
							chuteUrl,
							endpoint: '/speak',
							status: 200,
							success: true,
						});
						console.log(`✅ RECOVERY SUCCESS: ${chuteUrl}/speak`);
						break;
					}
				}
				if (successful.length > 0) {
					break;
				}
			}
		}

		expect(successful.length).toBeGreaterThan(0);
		console.log(`\n🎯 RECOMMENDATION: Use endpoint "${successful[0].endpoint}" on ${successful[0].chuteUrl}`);
	}, 180000);

	testOrSkip('Try with different request body formats on /speak endpoint', async () => {
		const ttsChuteUrl = process.env.WARMED_TTS_CHUTE || null;
		if (!ttsChuteUrl) {
			console.log('⏭️  Skipping - no warmed TTS chute available for /speak body format checks');
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
				const response = await fetch(`${ttsChuteUrl}/speak`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${API_KEY}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(format.body),
				});
				if (response.status === 200) {
					console.log(`✅ SUCCESS with ${format.name}`);
				} else {
					console.log(`❌ FAILED with ${format.name}: ${response.status}`);
				}
			} catch (error: any) {
				console.log(`❌ ERROR with ${format.name}: ${error.message}`);
			}
		}
	}, 180000);
});

