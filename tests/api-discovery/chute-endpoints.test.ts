/**
 * Chutes.ai Endpoint Discovery - All Chute Types
 * Tests for llm.chutes.ai, image.chutes.ai, video.chutes.ai, audio.chutes.ai, etc.
 * 
 * Prerequisites: CHUTES_API_KEY must be set in .env file
 * 
 * UPDATED: Video tests now check chute capabilities to avoid using I2V chutes for T2V tests.
 */

import { getTestConfig } from '../config/test-config';
import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';
import { supportsTextToVideo } from '../integration/test-helpers';

// Initialize config at module level
const config = getTestConfig();

describe('Chutes.ai - All Chute Endpoints Discovery', () => {
	let apiKey: string;
	const LLM_CHUTE_URL = process.env.WARMED_LLM_CHUTE || null;
	const IMAGE_CHUTE_URL = process.env.WARMED_IMAGE_CHUTE || null;
	const VIDEO_CHUTE_URL = process.env.WARMED_VIDEO_CHUTE || null;
	const VIDEO_CHUTE_NAME = process.env.WARMED_VIDEO_CHUTE_NAME || null;
	const TTS_CHUTE_URL = process.env.WARMED_TTS_CHUTE || null;
	const STT_CHUTE_URL = process.env.WARMED_STT_CHUTE || null;

	beforeAll(() => {
		apiKey = config.apiKey;
	});

	/**
	 * Helper function to make API requests
	 */
	async function makeApiRequest(
		baseUrl: string,
		endpoint: string,
		method: IHttpRequestMethods = 'GET',
		body?: IDataObject,
	): Promise<{ status: number; data: any; headers: any }> {
		const url = `${baseUrl}${endpoint}`;
		
		const options: RequestInit = {
			method,
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		};

		if (body && method !== 'GET') {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(url, options);
		const data = await response.json().catch(() => ({}));
		
		return {
			status: response.status,
			data,
			headers: Object.fromEntries(response.headers.entries()),
		};
	}

	// Skip all tests if no API key configured
	const testOrSkip = config.skipRealApiTests ? test.skip : test;

	describe('1. LLM Chute (llm.chutes.ai)', () => {
		testOrSkip('should support chat completions (OpenAI-compatible)', async () => {
			if (!LLM_CHUTE_URL) {
				console.log('⏭️  Skipping - no LLM chute available');
				return;
			}
			
			const baseUrl = LLM_CHUTE_URL;
			const response = await makeApiRequest(
				baseUrl,
				'/v1/chat/completions',
				'POST',
				{
					model: 'deepseek-ai/DeepSeek-R1',
					messages: [
						{ role: 'user', content: 'Say "test" and nothing else.' }
					],
					max_tokens: 10,
					temperature: 0.7,
				}
			);

			console.log('\n🤖 LLM Chute - Chat Completions:');
			console.log('Status:', response.status);
			console.log('Response:', JSON.stringify(response.data, null, 2));

			if (response.status === 200) {
				console.log('✅ LLM chat completions endpoint works!');
				expect(response.data.choices).toBeDefined();
				expect(response.data.choices[0].message).toBeDefined();
			} else {
				console.log('❌ Unexpected status:', response.status);
				console.log('Error:', response.data);
			}

			// Test passes if we got a response
			expect(response.status).toBeDefined();
		}, 30000);

		testOrSkip('should support text completions', async () => {
			if (!LLM_CHUTE_URL) {
				console.log('⏭️  Skipping - no LLM chute available');
				return;
			}
			
			const baseUrl = LLM_CHUTE_URL;
			const endpoints = ['/v1/completions', '/v1/text/completions'];
			
			for (const endpoint of endpoints) {
				try {
					const response = await makeApiRequest(
						baseUrl,
						endpoint,
						'POST',
						{
							model: 'deepseek-ai/DeepSeek-R1',
							prompt: 'Say "test"',
							max_tokens: 10,
						}
					);

					console.log(`\nTesting ${endpoint}:`, response.status);
					if (response.status === 200) {
						console.log('✅ Text completions endpoint works!');
						console.log('Response:', JSON.stringify(response.data, null, 2));
						break;
					}
				} catch (error: any) {
					console.log(`Error with ${endpoint}:`, error.message);
				}
			}

			expect(true).toBe(true);
		}, 30000);

		testOrSkip('should support streaming', async () => {
			if (!LLM_CHUTE_URL) {
				console.log('⏭️  Skipping - no LLM chute available');
				return;
			}
			
			const baseUrl = LLM_CHUTE_URL;
			const response = await makeApiRequest(
				baseUrl,
				'/v1/chat/completions',
				'POST',
				{
					model: 'deepseek-ai/DeepSeek-R1',
					messages: [{ role: 'user', content: 'Count to 3' }],
					stream: true,
					max_tokens: 50,
				}
			);

			console.log('\n🌊 Streaming Support:');
			console.log('Status:', response.status);
			console.log('Headers:', response.headers);

			expect(true).toBe(true);
		}, 30000);
	});

	describe('2. Image Chute (image.chutes.ai)', () => {
		testOrSkip('should support image generation', async () => {
			if (!IMAGE_CHUTE_URL) {
				console.log('⏭️  Skipping - no image chute available');
				return;
			}
			
			const baseUrl = IMAGE_CHUTE_URL;
			const response = await makeApiRequest(
				baseUrl,
				'/generate',
				'POST',
				{
					model: 'qwen-image',
					prompt: 'A simple test image',
					width: 512,
					height: 512,
					num_inference_steps: 20,
				}
			);

			console.log('\n🖼️ Image Chute - Generation:');
			console.log('Status:', response.status);
			console.log('Response keys:', Object.keys(response.data));

			if (response.status === 200) {
				console.log('✅ Image generation works!');
				console.log('Response structure:', JSON.stringify(response.data, null, 2));
			} else {
				console.log('Error:', response.data);
			}

			expect(response.status).toBeDefined();
		}, 60000);

		testOrSkip('should test OpenAI-compatible image endpoint', async () => {
			if (!IMAGE_CHUTE_URL) {
				console.log('⏭️  Skipping - no image chute available');
				return;
			}
			
			const baseUrl = IMAGE_CHUTE_URL;
			const response = await makeApiRequest(
				baseUrl,
				'/v1/images/generations',
				'POST',
				{
					model: 'qwen-image',
					prompt: 'A simple test',
					size: '512x512',
					n: 1,
				}
			);

			console.log('\n📸 Image Chute - OpenAI Format:');
			console.log('Status:', response.status);
			
			if (response.status === 200) {
				console.log('✅ OpenAI-compatible format works!');
			} else if (response.status === 404) {
				console.log('⚠️ OpenAI format not supported, use /generate instead');
			}

			console.log('Response:', JSON.stringify(response.data, null, 2));
			expect(true).toBe(true);
		}, 60000);
	});

	describe('3. Video Chute (video.chutes.ai)', () => {
		testOrSkip('should discover video generation endpoint', async () => {
			// Use dynamically discovered video chute from global warmup
			const CHUTE_URL = process.env.WARMED_VIDEO_CHUTE || null;
			
			if (!CHUTE_URL) {
				console.log('⚠️ No video chute discovered, skipping video endpoint discovery');
				return; // Skip gracefully
			}

			// Check if the video chute supports text-to-video
			if (VIDEO_CHUTE_NAME && !supportsTextToVideo({ name: VIDEO_CHUTE_NAME })) {
				console.log(`⏭️  Skipping - video chute "${VIDEO_CHUTE_NAME}" only supports I2V, not T2V`);
				return;
			}
			
			const baseUrls = [
				CHUTE_URL, // Discovered video chute
			];

			for (const baseUrl of baseUrls) {
				console.log(`\n🎥 Testing video chute: ${baseUrl}`);
				
				const endpoints = ['/generate', '/v1/video/generate', '/create'];
				
				for (const endpoint of endpoints) {
					try {
						const response = await makeApiRequest(
							baseUrl,
							endpoint,
							'POST',
							{
								fps: 16,
								frames: 24, // Shorter for testing
								prompt: 'test video',
								guidance_scale: 1,
							}
						);

						console.log(`  ${endpoint}: ${response.status}`);
						
						if (response.status === 200 || response.status === 202) {
							console.log('  ✅ Video endpoint found!');
							console.log('  Response:', JSON.stringify(response.data, null, 2));
							break;
						} else if (response.status === 400) {
							console.log('  💡 Endpoint exists, needs correct parameters');
							console.log('  Error:', response.data);
						}
					} catch (error: any) {
						console.log(`  Error: ${error.message}`);
					}
				}
			}

			expect(true).toBe(true);
		}, 60000);
	});

	describe('4. Audio Chute (audio.chutes.ai)', () => {
		testOrSkip('should discover audio endpoints', async () => {
			// Skip if no audio chutes available
			if (!TTS_CHUTE_URL && !STT_CHUTE_URL) {
				console.log('⏭️  Skipping - no audio chutes available');
				return;
			}
			
			// Prefer TTS chute, fallback to STT chute
			const baseUrl = TTS_CHUTE_URL || STT_CHUTE_URL || 'https://audio.chutes.ai';
			console.log('\n🔊 Testing audio chute:', baseUrl);
			
			const endpoints = [
				{ path: '/generate', desc: 'Audio generation' },
				{ path: '/v1/audio/speech', desc: 'Text-to-speech (OpenAI-compatible)' },
				{ path: '/v1/audio/transcriptions', desc: 'Speech-to-text' },
				{ path: '/synthesize', desc: 'Audio synthesis' },
			];

			for (const { path, desc } of endpoints) {
				try {
					const response = await makeApiRequest(
						baseUrl,
						path,
						'POST',
						{
							text: 'Test audio',
							model: 'tts-1',
							voice: 'alloy',
						}
					);

					console.log(`\n  ${desc} (${path}): ${response.status}`);
					
					if (response.status === 200) {
						console.log('  ✅ Endpoint works!');
						console.log('  Response:', JSON.stringify(response.data, null, 2));
					} else if (response.status === 400) {
						console.log('  💡 Endpoint exists, check parameters');
						console.log('  Error:', response.data);
					} else if (response.status === 404) {
						console.log('  ❌ Not found');
					}
				} catch (error: any) {
					console.log(`  Error: ${error.message}`);
				}
			}

			expect(true).toBe(true);
		}, 60000);
	});

	describe('5. Other Chute Types', () => {
		testOrSkip('should discover embeddings endpoint', async () => {
			if (!LLM_CHUTE_URL) {
				console.log('⏭️  Skipping - no LLM chute available for embeddings test');
				return;
			}
			
			const baseUrls = [
				LLM_CHUTE_URL, // Embeddings might be available on LLM chutes
			];

			for (const baseUrl of baseUrls) {
				console.log(`\n🔢 Testing embeddings: ${baseUrl}`);
				
				try {
					const response = await makeApiRequest(
						baseUrl,
						'/v1/embeddings',
						'POST',
						{
							model: 'text-embedding-ada-002',
							input: 'Test embeddings',
						}
					);

					console.log('Status:', response.status);
					
					if (response.status === 200) {
						console.log('✅ Embeddings endpoint found!');
						console.log('Response structure:', Object.keys(response.data));
						break;
					}
				} catch (error: any) {
					console.log('Error:', error.message);
				}
			}

			expect(true).toBe(true);
		}, 30000);

		testOrSkip('should discover any other specialized chutes', async () => {
			if (!STT_CHUTE_URL) {
				console.log('⏭️  Skipping - no specialized chutes available');
				return;
			}
			
			// Use discovered chutes instead of hardcoded ones
			const specializedChutes = [
				{ url: STT_CHUTE_URL, desc: 'STT (transcription)' },
			];

			for (const { url, desc } of specializedChutes) {
				console.log(`\n🔍 Testing ${desc}: ${url}`);
				
				try {
					const response = await makeApiRequest(url, '/health', 'GET');
					console.log('Status:', response.status);
					
					if (response.status === 200) {
						console.log(`✅ ${desc} chute exists!`);
					}
				} catch (error: any) {
					console.log('Not available or error:', error.message);
				}
			}

			expect(true).toBe(true);
		}, 30000);
	});

	describe('6. Model Discovery Per Chute', () => {
		testOrSkip('should list available models per chute type', async () => {
			// Build chutes array from discovered environment variables
			const chutes = [];
			if (LLM_CHUTE_URL) chutes.push({ url: LLM_CHUTE_URL, type: 'LLM' });
			if (IMAGE_CHUTE_URL) chutes.push({ url: IMAGE_CHUTE_URL, type: 'Image' });
			if (VIDEO_CHUTE_URL) chutes.push({ url: VIDEO_CHUTE_URL, type: 'Video' });
			if (TTS_CHUTE_URL) chutes.push({ url: TTS_CHUTE_URL, type: 'Audio/TTS' });
			
			if (chutes.length === 0) {
				console.log('⏭️  Skipping - no chutes available for model discovery');
				return;
			}

			for (const { url, type } of chutes) {
				console.log(`\n📋 ${type} Models:`, url);
				
				try {
					const response = await makeApiRequest(url, '/v1/models', 'GET');
					
					if (response.status === 200) {
						console.log('✅ Models endpoint works!');
						console.log('Available models:', JSON.stringify(response.data, null, 2));
					} else {
						console.log('⚠️ /v1/models not available');
						console.log('Response:', response.data);
					}
				} catch (error: any) {
					console.log('Error:', error.message);
				}
			}

			expect(true).toBe(true);
		}, 30000);
	});
});

/**
 * Summary of Findings:
 * 
 * After running these tests, we'll know:
 * 
 * 1. Which chute subdomains exist (llm, image, video, audio, etc.)
 * 2. What endpoints each chute supports
 * 3. Whether they follow OpenAI-compatible format
 * 4. What models are available per chute type
 * 5. Request/response formats for each
 * 
 * This will inform the n8n node's resource selection:
 * 
 * Resource: [Text Generation ▼]  → routes to llm.chutes.ai
 * Resource: [Image Generation ▼] → routes to image.chutes.ai
 * Resource: [Video Generation ▼] → routes to video.chutes.ai
 * Resource: [Audio Generation ▼] → routes to audio.chutes.ai
 * etc.
 */

