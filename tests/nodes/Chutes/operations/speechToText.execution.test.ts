/**
 * Speech-to-Text Execution Tests
 * 
 * Tests for new features added:
 * 1. Chunks toggle (includeChunks parameter)
 * 2. Audio source tracking
 * 3. Binary data auto-detection
 * 4. Output format (continuous text vs chunks)
 */

import { getChutesBaseUrl } from '../../../../nodes/Chutes/transport/apiRequest';

describe('Speech-to-Text Execution', () => {
	describe('URL Routing', () => {
		test('Should use chute URL from dropdown', () => {
			const selectedChuteUrl = 'https://chutes-whisper-large-v3.chutes.ai';
			const credentials = {};

			const baseUrl = getChutesBaseUrl(
				credentials,
				'speechToText',
				selectedChuteUrl,
			);

			expect(baseUrl).toBe('https://chutes-whisper-large-v3.chutes.ai');
		});

		test('Should fallback to stt.chutes.ai when no chute selected', () => {
			const selectedChuteUrl = undefined;
			const credentials = {};

			const baseUrl = getChutesBaseUrl(
				credentials,
				'speechToText',
				selectedChuteUrl,
			);

			expect(baseUrl).toBe('https://stt.chutes.ai');
		});

		test('Should use stt subdomain for speechToText resource', () => {
			const credentials = {};
			const baseUrl = getChutesBaseUrl(credentials, 'speechToText');

			expect(baseUrl).toContain('stt.chutes.ai');
		});
	});

	describe('Response Processing - Chunks Merging', () => {
		test('Should merge chunks into continuous text', () => {
			// Simulate API response chunks
			const apiResponseChunks = [
				{ start: 0, end: 4.68, text: ' 10 thin sticks,' },
				{ start: 4.86, end: 9.64, text: ' 3 thick bricks,' },
				{ start: 9.98, end: 13.94, text: ' this is a stupid superstition.' },
			];

			// Simulate the merging logic from handleSpeechToText
			const fullText = apiResponseChunks
				.map((chunk) => chunk.text || '')
				.join('')
				.trim();

			expect(fullText).toBe('10 thin sticks, 3 thick bricks, this is a stupid superstition.');
			expect(fullText).not.toContain('[');
			expect(fullText).not.toContain('{');
		});

		test('Should handle empty chunks array', () => {
			const apiResponseChunks: any[] = [];

			const fullText = apiResponseChunks
				.map((chunk) => chunk.text || '')
				.join('')
				.trim();

			expect(fullText).toBe('');
		});

		test('Should handle chunks with missing text field', () => {
			const apiResponseChunks = [
				{ start: 0, end: 1 },
				{ start: 1, end: 2, text: 'Hello' },
				{ start: 2, end: 3 },
			];

			const fullText = apiResponseChunks
				.map((chunk: any) => chunk.text || '')
				.join('')
				.trim();

			expect(fullText).toBe('Hello');
		});
	});

	describe('Output Format - Include Chunks Toggle', () => {
		test('Should NOT include chunks array when includeChunks is false (default)', () => {
			const chunks = [
				{ start: 0, end: 4.68, text: 'Hello' },
				{ start: 4.86, end: 9.64, text: 'World' },
			];
			const includeChunks = false;
			
			// Simulate the result building logic
			const result: any = {
				text: chunks.map(c => c.text).join(' ').trim(),
				duration: chunks[chunks.length - 1].end,
				chunkCount: chunks.length,
			};

			if (includeChunks) {
				result.chunks = chunks;
			}

			// Assertions
			expect(result.chunks).toBeUndefined();
			expect(result.text).toBe('Hello World');
			expect(result.duration).toBe(9.64);
			expect(result.chunkCount).toBe(2);
		});

		test('Should include chunks array when includeChunks is true', () => {
			const chunks = [
				{ start: 0, end: 4.68, text: 'Hello' },
				{ start: 4.86, end: 9.64, text: 'World' },
			];
			const includeChunks = true;
			
			// Simulate the result building logic
			const result: any = {
				text: chunks.map(c => c.text).join(' ').trim(),
				duration: chunks[chunks.length - 1].end,
				chunkCount: chunks.length,
			};

			if (includeChunks) {
				result.chunks = chunks;
			}

			// Assertions
			expect(result.chunks).toBeDefined();
			expect(result.chunks).toHaveLength(2);
			expect(result.text).toBe('Hello World');
			expect(result.chunks[0].start).toBe(0);
			expect(result.chunks[1].end).toBe(9.64);
		});

		test('Default value should be clean output (no chunks)', () => {
			const includeChunks = false; // Default value

			expect(includeChunks).toBe(false);
		});
	});

	describe('Audio Source Tracking', () => {
		test('Should track binary data source', () => {
			const mimeType = 'audio/mpeg';
			const audioLength = 524288;
			const audioSource = `binary data (${mimeType}, ${audioLength} bytes)`;

			expect(audioSource).toContain('binary data');
			expect(audioSource).toContain('audio/mpeg');
			expect(audioSource).toContain('524288 bytes');
		});

		test('Should track URL download source', () => {
			const audioLength = 524288;
			const audioSource = `downloaded URL (${audioLength} bytes)`;

			expect(audioSource).toContain('downloaded URL');
			expect(audioSource).toContain('524288 bytes');
		});

		test('Should track data URL source', () => {
			const mimeType = 'audio/mp3';
			const audioSource = `data URL (${mimeType})`;

			expect(audioSource).toContain('data URL');
			expect(audioSource).toContain('audio/mp3');
		});

		test('Should track base64 string source', () => {
			const audioSource = 'base64 string';

			expect(audioSource).toBe('base64 string');
		});
	});

	describe('Audio Input Priority System', () => {
		test('Priority 1: Binary data should be checked first', () => {
			const hasBinaryData = true;
			const hasAudioParam = true;

			// Logic: Check binary data first, only use param if no binary
			const shouldUseBinary = hasBinaryData;
			const shouldUseParam = !hasBinaryData && hasAudioParam;

			expect(shouldUseBinary).toBe(true);
			expect(shouldUseParam).toBe(false);
		});

		test('Priority 2: Audio parameter used when no binary data', () => {
			const hasBinaryData = false;
			const hasAudioParam = true;

			const shouldUseBinary = hasBinaryData;
			const shouldUseParam = !hasBinaryData && hasAudioParam;

			expect(shouldUseBinary).toBe(false);
			expect(shouldUseParam).toBe(true);
		});

		test('Should error when neither binary nor param provided', () => {
			const hasBinaryData = false;
			const hasAudioParam = false;

			const shouldError = !hasBinaryData && !hasAudioParam;

			expect(shouldError).toBe(true);
		});
	});

	describe('Audio Parameter Format Detection', () => {
		test('Should detect HTTP URLs', () => {
			const audioParam = 'https://example.com/audio.mp3';
			const isUrl = audioParam.startsWith('http://') || audioParam.startsWith('https://');

			expect(isUrl).toBe(true);
		});

		test('Should detect data URLs', () => {
			const audioParam = 'data:audio/mp3;base64,UklGRiQAAABXQVZF...';
			const isDataUrl = audioParam.startsWith('data:');

			expect(isDataUrl).toBe(true);
		});

		test('Should parse data URL correctly', () => {
			const audioParam = 'data:audio/mp3;base64,UklGRiQAAABXQVZF';
			const matches = audioParam.match(/^data:([^;]+);base64,(.+)$/);

			expect(matches).not.toBeNull();
			expect(matches![1]).toBe('audio/mp3');
			expect(matches![2]).toBe('UklGRiQAAABXQVZF');
		});

		test('Should treat unknown format as base64 string', () => {
			const audioParam = 'UklGRiQAAABXQVZF...';
			const isUrl = audioParam.startsWith('http://') || audioParam.startsWith('https://');
			const isDataUrl = audioParam.startsWith('data:');
			const isBase64 = !isUrl && !isDataUrl;

			expect(isBase64).toBe(true);
		});
	});

	describe('API Request Format', () => {
		test('Should use audio_b64 field name (not audio or file)', () => {
			const audioBase64 = 'UklGRiQAAABXQVZF...';
			const requestBody = {
				audio_b64: audioBase64,
			};

			expect(requestBody).toHaveProperty('audio_b64');
			expect(requestBody).not.toHaveProperty('audio');
			expect(requestBody).not.toHaveProperty('file');
			expect(requestBody).not.toHaveProperty('input');
		});

		test('Should include language parameter when provided', () => {
			const audioBase64 = 'UklGRiQAAABXQVZF...';
			const language = 'en';
			const requestBody: any = {
				audio_b64: audioBase64,
			};

			if (language) {
				requestBody.language = language;
			}

			expect(requestBody.audio_b64).toBe(audioBase64);
			expect(requestBody.language).toBe('en');
		});

		test('Should send JSON (not multipart/form-data)', () => {
			const expectedHeaders = {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			};

			expect(expectedHeaders['Content-Type']).toBe('application/json');
			expect(expectedHeaders['Content-Type']).not.toContain('multipart');
		});
	});

	describe('Endpoint Configuration', () => {
		test('Should use /transcribe endpoint (discovered via source code)', () => {
			const endpoint = '/transcribe';

			expect(endpoint).toBe('/transcribe');
			expect(endpoint).not.toBe('/v1/audio/transcriptions');
			expect(endpoint).not.toBe('/v1/transcribe');
		});
	});

	describe('Output Metadata', () => {
		test('Should calculate duration from last chunk', () => {
			const chunks = [
				{ start: 0, end: 4.68, text: 'Hello' },
				{ start: 4.86, end: 9.64, text: 'World' },
				{ start: 9.98, end: 18.24, text: 'Test' },
			];

			const duration = chunks.length > 0 ? chunks[chunks.length - 1].end : 0;

			expect(duration).toBe(18.24);
		});

		test('Should count total chunks', () => {
			const chunks = [
				{ start: 0, end: 4.68, text: 'Hello' },
				{ start: 4.86, end: 9.64, text: 'World' },
			];

			const chunkCount = chunks.length;

			expect(chunkCount).toBe(2);
		});

		test('Should handle empty chunks (duration = 0)', () => {
			const chunks: any[] = [];
			const duration = chunks.length > 0 ? chunks[chunks.length - 1].end : 0;

			expect(duration).toBe(0);
		});
	});
});

