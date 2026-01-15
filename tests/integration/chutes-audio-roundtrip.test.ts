/**
 * Integration Tests for Audio TTS-to-STT Round-Trip
 * 
 * This test suite verifies that:
 * 1. Text-to-Speech (TTS) can generate audio from text
 * 2. Speech-to-Text (STT) can transcribe that audio back
 * 3. The transcription is reasonably similar to the original text
 * 
 * This provides end-to-end verification that both TTS and STT work correctly together.
 */

import 'dotenv/config';
import { withRetry } from './test-helpers';

const API_KEY = process.env.CHUTES_API_KEY;
const TTS_CHUTE_URL = process.env.WARMED_TTS_CHUTE || null;
const STT_CHUTE_URL = process.env.WARMED_STT_CHUTE || null;

describe('Audio TTS-to-STT Round-Trip (Integration)', () => {
	// Skip if no API key or if chutes unavailable
	const testOrSkip = (API_KEY && TTS_CHUTE_URL && STT_CHUTE_URL) ? test : test.skip;

	if (!API_KEY) {
		console.warn('⚠️  CHUTES_API_KEY not set, skipping audio round-trip tests');
	}
	if (!TTS_CHUTE_URL) {
		console.warn('⚠️  No TTS chute available, skipping audio round-trip tests');
	}
	if (!STT_CHUTE_URL) {
		console.warn('⚠️  No STT chute available, skipping audio round-trip tests');
	}

	describe('Text-to-Speech', () => {
		testOrSkip('should generate audio from text', async () => {
			console.log('\n📢 TTS: Generating audio from text...');
			console.log(`   Using chute: ${TTS_CHUTE_URL}`);

			try {
				const result = await withRetry(async () => {
					const response = await fetch(`${TTS_CHUTE_URL}/speak`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							text: 'Hello world',
							voice: 'af_bella', // American Female - Bella
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						if (response.status === 429) {
							throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
						}
						if (response.status === 502 || response.status === 503) {
							throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
						}
						throw new Error(`API error ${response.status}: ${error}`);
					}

					return response;
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'tts',
					currentChuteUrl: TTS_CHUTE_URL || undefined,
				});

				const buffer = await result.arrayBuffer();
				expect(buffer.byteLength).toBeGreaterThan(0);

				console.log(`   ✅ Generated ${buffer.byteLength} bytes of audio`);
			} catch (error) {
				const errorMsg = String(error);
				if (errorMsg.includes('CHUTE_AT_CAPACITY') || 
				    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
				    errorMsg.includes('CHUTE_UNAVAILABLE')) {
					console.log('⏭️ Skipping - TTS chute(s) at capacity or unavailable');
					return;
				}
				throw error;
			}
		}, 60000);

		testOrSkip('should generate audio with different voices', async () => {
			console.log('\n🎤 TTS: Testing different voice...');

			try {
				const result = await withRetry(async () => {
					const response = await fetch(`${TTS_CHUTE_URL}/speak`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							text: 'Testing different voice',
							voice: 'am_adam', // American Male - Adam
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						if (response.status === 429) {
							throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
						}
						if (response.status === 502 || response.status === 503) {
							throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
						}
						throw new Error(`API error ${response.status}: ${error}`);
					}

					return response;
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'tts',
					currentChuteUrl: TTS_CHUTE_URL || undefined,
				});

				const buffer = await result.arrayBuffer();
				expect(buffer.byteLength).toBeGreaterThan(0);

				console.log(`   ✅ Generated ${buffer.byteLength} bytes with voice am_adam`);
			} catch (error) {
				const errorMsg = String(error);
				if (errorMsg.includes('CHUTE_AT_CAPACITY') || 
				    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
				    errorMsg.includes('CHUTE_UNAVAILABLE')) {
					console.log('⏭️ Skipping - TTS chute(s) at capacity or unavailable');
					return;
				}
				throw error;
			}
		}, 60000);
	});

	describe('Speech-to-Text', () => {
		testOrSkip('should transcribe audio buffer', async () => {
			try {
				// First, generate audio with TTS
				console.log('\n📢 TTS: Generating audio for STT test...');
				const ttsResult = await withRetry(async () => {
					const response = await fetch(`${TTS_CHUTE_URL}/speak`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							text: 'Hello world',
							voice: 'af_bella',
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						if (response.status === 429) {
							throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
						}
						if (response.status === 502 || response.status === 503) {
							throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
						}
						throw new Error(`API error ${response.status}: ${error}`);
					}

					return response;
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'tts',
					currentChuteUrl: TTS_CHUTE_URL || undefined,
				});

				const audioBuffer = await ttsResult.arrayBuffer();
				console.log(`   ✅ Generated ${audioBuffer.byteLength} bytes of audio`);

				// Now transcribe with STT
				console.log('🎧 STT: Transcribing audio back to text...');
				console.log(`   Using chute: ${STT_CHUTE_URL}`);

				// Convert ArrayBuffer to base64 for STT API
				const base64Audio = Buffer.from(audioBuffer).toString('base64');

				const sttResult = await withRetry(async () => {
					const response = await fetch(`${STT_CHUTE_URL}/transcribe`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							audio_b64: base64Audio,
							language: 'en',
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						if (response.status === 429) {
							throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
						}
						if (response.status === 502 || response.status === 503) {
							throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
						}
						throw new Error(`API error ${response.status}: ${error}`);
					}

					return response;
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'stt',
					currentChuteUrl: STT_CHUTE_URL || undefined,
				});

				// Response is array of chunks: [{ start, end, text }, ...]
				const chunks = await sttResult.json() as Array<{ start: number; end: number; text: string }>;
				const transcription = { text: chunks.map(c => c.text || '').join('').trim() };
				
				expect(transcription).toBeDefined();
				expect(transcription.text).toBeDefined();
				expect(typeof transcription.text).toBe('string');
				expect(transcription.text.length).toBeGreaterThan(0);

				console.log(`   ✅ Transcription: "${transcription.text}"`);
			} catch (error) {
				const errorMsg = String(error);
				if (errorMsg.includes('CHUTE_AT_CAPACITY') || 
				    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
				    errorMsg.includes('CHUTE_UNAVAILABLE')) {
					console.log('⏭️ Skipping - TTS/STT chute(s) at capacity or unavailable');
					return;
				}
				throw error;
			}
		}, 90000); // 90 seconds for both TTS and STT
	});

	describe('TTS-to-STT Round-Trip', () => {
		testOrSkip('should round-trip simple text', async () => {
			const originalText = 'Hello world';

			console.log(`\n🔄 Round-trip test: "${originalText}"`);

			try {
				// Step 1: Generate audio from text
				console.log('📢 Step 1: TTS - Converting text to speech...');
				const ttsResult = await withRetry(async () => {
					const response = await fetch(`${TTS_CHUTE_URL}/speak`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							text: originalText,
							voice: 'af_bella',
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						if (response.status === 429) {
							throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
						}
						if (response.status === 502 || response.status === 503) {
							throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
						}
						throw new Error(`API error ${response.status}: ${error}`);
					}

					return response;
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'tts',
					currentChuteUrl: TTS_CHUTE_URL || undefined,
				});

				const audioBuffer = await ttsResult.arrayBuffer();
				console.log(`   ✅ Generated ${audioBuffer.byteLength} bytes of audio`);

				// Step 2: Transcribe audio back to text
				console.log('🎧 Step 2: STT - Transcribing audio back to text...');
				const base64Audio = Buffer.from(audioBuffer).toString('base64');

				const sttResult = await withRetry(async () => {
					const response = await fetch(`${STT_CHUTE_URL}/transcribe`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							audio_b64: base64Audio,
							language: 'en',
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						if (response.status === 429) {
							throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
						}
						if (response.status === 502 || response.status === 503) {
							throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
						}
						throw new Error(`API error ${response.status}: ${error}`);
					}

					return response;
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'stt',
					currentChuteUrl: STT_CHUTE_URL || undefined,
				});

				const chunks = await sttResult.json() as Array<{ start: number; end: number; text: string }>;
				const transcription = { text: chunks.map(c => c.text || '').join('').trim() };
				expect(transcription.text).toBeDefined();

				// Step 3: Verify the transcription is similar to original
				const transcribedLower = transcription.text.toLowerCase().trim();

				console.log(`   📝 Original:     "${originalText}"`);
				console.log(`   📝 Transcribed:  "${transcription.text}"`);

				// Check if transcription contains key words
				const containsHello = transcribedLower.includes('hello');
				const containsWorld = transcribedLower.includes('world');

				console.log(`   🔍 Contains 'hello': ${containsHello}`);
				console.log(`   🔍 Contains 'world': ${containsWorld}`);

				// At least one key word should be present
				expect(containsHello || containsWorld).toBe(true);
				
				if (containsHello && containsWorld) {
					console.log('   ✅ Perfect match! Both key words found.');
				} else {
					console.log('   ✅ Partial match - at least one key word found.');
				}
			} catch (error) {
				const errorMsg = String(error);
				if (errorMsg.includes('CHUTE_AT_CAPACITY') || 
				    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
				    errorMsg.includes('CHUTE_UNAVAILABLE')) {
					console.log('⏭️ Skipping - TTS/STT chute(s) at capacity or unavailable');
					return;
				}
				throw error;
			}
		}, 120000); // 2 minutes for full round-trip

		testOrSkip('should round-trip a longer sentence', async () => {
			const originalText = 'The quick brown fox jumps over the lazy dog';

			console.log(`\n🔄 Round-trip test: "${originalText}"`);

			try {
				// Generate audio
				console.log('📢 TTS: Converting text to speech...');
				const ttsResult = await withRetry(async () => {
					const response = await fetch(`${TTS_CHUTE_URL}/speak`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							text: originalText,
							voice: 'af_bella',
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						if (response.status === 429) {
							throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
						}
						if (response.status === 502 || response.status === 503) {
							throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
						}
						throw new Error(`API error ${response.status}: ${error}`);
					}

					return response;
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'tts',
					currentChuteUrl: TTS_CHUTE_URL || undefined,
				});

				const audioBuffer = await ttsResult.arrayBuffer();
				console.log(`   ✅ Generated ${audioBuffer.byteLength} bytes`);

				// Transcribe
				console.log('🎧 STT: Transcribing audio...');
				const base64Audio = Buffer.from(audioBuffer).toString('base64');

				const sttResult = await withRetry(async () => {
					const response = await fetch(`${STT_CHUTE_URL}/transcribe`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							audio_b64: base64Audio,
							language: 'en',
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						if (response.status === 429) {
							throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
						}
						if (response.status === 502 || response.status === 503) {
							throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
						}
						throw new Error(`API error ${response.status}: ${error}`);
					}

					return response;
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'stt',
					currentChuteUrl: STT_CHUTE_URL || undefined,
				});

				const chunks = await sttResult.json() as Array<{ start: number; end: number; text: string }>;
				const transcription = { text: chunks.map(c => c.text || '').join('').trim() };

				console.log(`   📝 Original:     "${originalText}"`);
				console.log(`   📝 Transcribed:  "${transcription.text}"`);

				// Check for key words
				const transcribedLower = transcription.text.toLowerCase();
				const keyWords = ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog'];
				const foundWords = keyWords.filter(word => transcribedLower.includes(word));

				console.log(`   🔍 Found ${foundWords.length}/${keyWords.length} key words: ${foundWords.join(', ')}`);

				// At least half of the key words should be recognized
				expect(foundWords.length).toBeGreaterThanOrEqual(3);
				console.log('   ✅ Sufficient key words found!');
			} catch (error) {
				const errorMsg = String(error);
				if (errorMsg.includes('CHUTE_AT_CAPACITY') || 
				    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
				    errorMsg.includes('CHUTE_UNAVAILABLE')) {
					console.log('⏭️ Skipping - TTS/STT chute(s) at capacity or unavailable');
					return;
				}
				throw error;
			}
		}, 120000);

		testOrSkip('should work with different TTS voices', async () => {
			const voices = ['af_bella', 'am_adam'];
			const text = 'Testing voice';

			try {
				for (const voice of voices) {
					console.log(`\n🎤 Testing voice: ${voice}`);

					// Generate audio
					const ttsResult = await withRetry(async () => {
						const response = await fetch(`${TTS_CHUTE_URL}/speak`, {
							method: 'POST',
							headers: {
								'Authorization': `Bearer ${API_KEY}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								text,
								voice,
							}),
						});

						if (!response.ok) {
							const error = await response.text();
							if (response.status === 429) {
								throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
							}
							if (response.status === 502 || response.status === 503) {
								throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
							}
							throw new Error(`API error ${response.status}: ${error}`);
						}

						return response;
					}, {
						maxRetries: 5,
						delayMs: 5000,
						category: 'tts',
						currentChuteUrl: TTS_CHUTE_URL || undefined,
					});

					const audioBuffer = await ttsResult.arrayBuffer();
					console.log(`   ✅ Generated ${audioBuffer.byteLength} bytes`);

					// Transcribe
					const base64Audio = Buffer.from(audioBuffer).toString('base64');
					const sttResult = await withRetry(async () => {
						const response = await fetch(`${STT_CHUTE_URL}/transcribe`, {
							method: 'POST',
							headers: {
								'Authorization': `Bearer ${API_KEY}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								audio_b64: base64Audio,
								language: 'en',
							}),
						});

						if (!response.ok) {
							const error = await response.text();
							if (response.status === 429) {
								throw new Error(`CHUTE_AT_CAPACITY: 429 - ${error}`);
							}
							if (response.status === 502 || response.status === 503) {
								throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
							}
							throw new Error(`API error ${response.status}: ${error}`);
						}

						return response;
					}, {
						maxRetries: 5,
						delayMs: 5000,
						category: 'stt',
						currentChuteUrl: STT_CHUTE_URL || undefined,
					});

					const chunks = await sttResult.json() as Array<{ start: number; end: number; text: string }>;
					const transcription = { text: chunks.map(c => c.text || '').join('').trim() };
					console.log(`   ✅ Transcribed: "${transcription.text}"`);
					expect(transcription.text.length).toBeGreaterThan(0);
				}

				console.log('   ✅ All voices tested successfully!');
			} catch (error) {
				const errorMsg = String(error);
				if (errorMsg.includes('CHUTE_AT_CAPACITY') || 
				    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
				    errorMsg.includes('CHUTE_UNAVAILABLE')) {
					console.log('⏭️ Skipping - TTS/STT chute(s) at capacity or unavailable');
					return;
				}
				throw error;
			}
		}, 180000); // 3 minutes for multiple voices
	});
});

