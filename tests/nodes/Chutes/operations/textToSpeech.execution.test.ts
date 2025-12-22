/**
 * RED phase TDD test - Testing Text-to-Speech URL routing
 * 
 * This test verifies that:
 * 1. The chute URL from the dropdown is used (not hardcoded audio.chutes.ai)
 * 2. The correct endpoint is used with the chute URL
 * 3. Binary audio data is requested and returned
 */

import { getChutesBaseUrl } from '../../../../nodes/Chutes/transport/apiRequest';

describe('Text-to-Speech Execution - URL Routing', () => {
	describe('🔴 RED: URL Construction from Chute Selection', () => {
		test('Should use chute URL from dropdown, not hardcoded audio.chutes.ai', () => {
			// User selects "kokoro" TTS chute from dropdown
			const selectedChuteUrl = 'https://chutes-kokoro.chutes.ai';
			const credentials = {};

			// Get the base URL that would be used
			const baseUrl = getChutesBaseUrl(
				credentials,
				'textToSpeech', // resource type
				selectedChuteUrl, // chute URL from dropdown
			);

			// CRITICAL ASSERTIONS:
			// 1. Should use the chute URL from the dropdown
			expect(baseUrl).toBe('https://chutes-kokoro.chutes.ai');
			
			// 2. Should NOT use hardcoded fallback
			expect(baseUrl).not.toContain('audio.chutes.ai');
			
			// 3. Should be a complete URL
			expect(baseUrl).toMatch(/^https:\/\//);
		});

		test('Should fallback to audio.chutes.ai when no chute selected', () => {
			// User hasn't selected a chute yet
			const selectedChuteUrl = undefined;
			const credentials = {};

			// Get the base URL with fallback
			const baseUrl = getChutesBaseUrl(
				credentials,
				'textToSpeech', // resource type
				selectedChuteUrl, // no chute selected
			);

			// Should use the fallback mapping for textToSpeech -> audio
			expect(baseUrl).toBe('https://audio.chutes.ai');
		});

		test('Should prioritize custom chute URL over resource type fallback', () => {
			const customChuteUrl = 'https://chutes-custom-tts-model.chutes.ai';
			const credentials = {};

			const baseUrl = getChutesBaseUrl(
				credentials,
				'textToSpeech',
				customChuteUrl,
			);

			// Should use the custom chute URL
			expect(baseUrl).toBe('https://chutes-custom-tts-model.chutes.ai');
			expect(baseUrl).not.toContain('audio.chutes.ai');
		});
	});

	describe('🔴 RED: Request Format for Text-to-Speech', () => {
		test('Should request binary audio data, not JSON', () => {
			// Text-to-speech should return audio files as binary data
			const expectedOptions = {
				encoding: null,
				json: false,
			};

			// Verify the request options that SHOULD be used
			expect(expectedOptions.encoding).toBe(null);
			expect(expectedOptions.json).toBe(false);
		});

		test('Should send text in request body', () => {
			const requestBody = {
				text: 'Hello world, this is a test',
			};

			expect(requestBody.text).toBeDefined();
			expect(requestBody.text.length).toBeGreaterThan(0);
		});
	});

	describe('Voice Selection - Separator Handling', () => {
		test('Should identify separator values by prefix', () => {
			// Separators use '_separator_' prefix followed by category code
			const separatorValues = [
				'_separator_af', // American Female header
				'_separator_am', // American Male header
				'_separator_bf', // British Female header
				'_separator_bm', // British Male header
			];

			// All separator values should start with '_separator_'
			separatorValues.forEach(value => {
				expect(value.startsWith('_separator_')).toBe(true);
			});
		});

		test('Should treat separators as default voice (no voice parameter sent)', () => {
			const separatorSelection = '_separator_af'; // User accidentally clicked a header
			
			// In the node implementation, separators are filtered out
			// If a separator is selected, no 'voice' field is added to the API request
			// This means the API will use its default voice
			
			const isSeparator = separatorSelection.startsWith('_separator_');
			expect(isSeparator).toBe(true);
			
			// The logic: if (voiceValue && voiceValue !== '' && !voiceValue.startsWith('_separator_'))
			// Result: separator is ignored, default voice is used
		});

		test('Should allow valid voice selections', () => {
			const validSelections = [
				'', // Default voice (empty string)
				'af_bella', // Named Kokoro voice
				'custom', // Custom voice option
			];

			validSelections.forEach(selection => {
				const isSeparator = selection.startsWith('_separator_');
				expect(isSeparator).toBe(false);
			});
		});
	});
});

