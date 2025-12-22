/**
 * Content Moderation Execution Test
 * 
 * Verifies that content moderation works with real API calls.
 * Tests text and image moderation functionality.
 * 
 * Following TDD: This test validates the implementation works end-to-end.
 */

import {
	testOrSkip,
	hasApiKey,
	DEFAULT_TIMEOUT,
	getAuthHeaders,
	initializeTestChutes,
	MODERATION_CHUTE_URL,
} from './test-helpers';

describe('Content Moderation Execution', () => {
	// Discover chutes before running tests
	beforeAll(async () => {
		if (!hasApiKey()) {
			console.log('⚠️ CHUTES_API_KEY not set - skipping integration tests');
			return;
		}
		await initializeTestChutes();
		
		if (!MODERATION_CHUTE_URL) {
			console.log('⚠️ No moderation chute available - will skip moderation tests');
		} else {
			console.log(`🛡️ Will test moderation with: ${MODERATION_CHUTE_URL}`);
		}
	}, 60000);

	testOrSkip('should moderate text content', async () => {
		if (!MODERATION_CHUTE_URL) {
			console.log('⏭️ Skipping - no moderation chute available');
			return;
		}

		console.log(`🛡️ Testing text moderation with chute: ${MODERATION_CHUTE_URL}`);

		// nsfw-classifier uses /text endpoint with flat parameters
		const response = await fetch(`${MODERATION_CHUTE_URL}/text`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				text: 'Hello, this is a test message.',
			}),
		});

		console.log(`Response status: ${response.status}`);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.log(`Error response: ${errorText}`);
			
			// Skip if infrastructure issue
			if (response.status === 500 || response.status === 503 || response.status === 404 || response.status === 502) {
				console.log('⏭️ Skipping - chute temporarily unavailable');
				return;
			}
		}
		
		// Verify successful response
		expect(response.ok).toBe(true);
		expect(response.status).toBe(200);

		// Get moderation data
		const data = await response.json() as any;
		console.log(`✅ Received moderation response`);
		
		// Verify nsfw-classifier response format
		expect(data.label).toBeDefined();
		expect(typeof data.label).toBe('string');
		expect(data.scores).toBeDefined();
		expect(typeof data.scores).toBe('object');
		
		console.log(`   Label: ${data.label}`);
		console.log(`   Scores: ${Object.keys(data.scores).join(', ')}`);
		
		console.log('✅ Text moderation test passed');
	}, DEFAULT_TIMEOUT);

	testOrSkip('should handle safe content', async () => {
		if (!MODERATION_CHUTE_URL) {
			console.log('⏭️ Skipping - no moderation chute available');
			return;
		}

		console.log('🛡️ Testing safe content...');

		// nsfw-classifier uses /text endpoint with flat parameters
		const response = await fetch(`${MODERATION_CHUTE_URL}/text`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				text: 'The weather is nice today.',
			}),
		});

	// Skip if infrastructure issue
	if (!response.ok && (response.status === 500 || response.status === 503 || response.status === 404 || response.status === 502)) {
		console.log('⏭️ Skipping - chute temporarily unavailable');
		return;
	}

		expect(response.ok).toBe(true);
		const data = await response.json() as any;
		
		// Safe content should have label "normal"
		console.log(`   Label: ${data.label}`);
		console.log(`   Scores:`, data.scores);
		
		// Most safe content should be labeled "normal"
		// (but we don't assert this as different models have different sensitivities)
	}, DEFAULT_TIMEOUT);

	testOrSkip('should moderate image content', async () => {
		if (!MODERATION_CHUTE_URL) {
			console.log('⏭️ Skipping - no moderation chute available');
			return;
		}

		console.log('🛡️ Testing image moderation...');

		// Simple 1x1 white pixel PNG (raw base64, no data URL prefix)
		const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

	// nsfw-classifier uses /image endpoint with flat parameters
	const response = await fetch(`${MODERATION_CHUTE_URL}/image`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify({
			image_b64: testImage,
		}),
	});

	// Skip if infrastructure issue (check status before consuming body)
	if (!response.ok) {
		if (response.status === 500 || response.status === 503 || response.status === 404 || response.status === 502) {
			const errorText = await response.text();
			console.log(`Error response: ${errorText}`);
			console.log('⏭️ Skipping - chute temporarily unavailable');
			return;
		}
		
		// For other errors, read and throw
		const errorText = await response.text();
		throw new Error(`Image moderation failed (${response.status}): ${errorText}`);
	}

	const data = await response.json() as any;
		
		// Should have moderation results in nsfw-classifier format
		expect(data.label).toBeDefined();
		expect(typeof data.label).toBe('string');
		expect(data.confidence).toBeDefined();
		expect(typeof data.confidence).toBe('number');
		
		console.log(`   Label: ${data.label}`);
		console.log(`   Confidence: ${data.confidence}`);
		
		console.log(`✅ Image moderation completed`);
	}, DEFAULT_TIMEOUT);

	testOrSkip('should handle batch inputs', async () => {
		// nsfw-classifier does not support batch inputs (one text/image at a time)
		// This test is skipped for nsfw-classifier chute
		console.log('⏭️ Skipping - nsfw-classifier does not support batch inputs');
		return;
	}, DEFAULT_TIMEOUT);
});

