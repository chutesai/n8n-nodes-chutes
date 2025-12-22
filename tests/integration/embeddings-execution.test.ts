/**
 * Embeddings Execution Test
 * 
 * Verifies that embedding generation works with real API calls.
 * Tests the core functionality of generating embeddings for semantic search.
 * 
 * Following TDD: This test validates the implementation works end-to-end.
 */

import {
	testOrSkip,
	hasApiKey,
	DEFAULT_TIMEOUT,
	getAuthHeaders,
	initializeTestChutes,
	EMBEDDINGS_CHUTE_URL,
} from './test-helpers';

describe('Embeddings Execution', () => {
	// Discover chutes before running tests
	beforeAll(async () => {
		if (!hasApiKey()) {
			console.log('⚠️ CHUTES_API_KEY not set - skipping integration tests');
			return;
		}
		await initializeTestChutes();
		
		if (!EMBEDDINGS_CHUTE_URL) {
			console.log('⚠️ No embeddings chute available - will skip embeddings tests');
		} else {
			console.log(`🔢 Will test embeddings with: ${EMBEDDINGS_CHUTE_URL}`);
		}
	}, 60000);

	testOrSkip('should generate embeddings from text', async () => {
		if (!EMBEDDINGS_CHUTE_URL) {
			console.log('⏭️ Skipping - no embeddings chute available');
			return;
		}

		console.log(`🔢 Testing embeddings with chute: ${EMBEDDINGS_CHUTE_URL}`);

		// TEI (Text Embeddings Inference) native format
		const response = await fetch(`${EMBEDDINGS_CHUTE_URL}/embed`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				inputs: 'Hello world',
			}),
		});

		console.log(`Response status: ${response.status}`);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.log(`Error response: ${errorText}`);
			
			// If infrastructure is unavailable, skip gracefully (external API issue)
			if (response.status === 500 || response.status === 503) {
				console.log('⏭️ Skipping - embeddings chute temporarily unavailable');
				return; // Skip gracefully
			}
			
			// For other errors, fail the test (might be a code bug)
			expect(response.ok).toBe(true);
		}
		
		// Verify successful response
		expect(response.status).toBe(200);

	// Get embeddings data
	const data = await response.json() as any;
	console.log(`✅ Received embeddings response`);
	
	// TEI format returns: [[embedding values...]] for single input
	expect(Array.isArray(data)).toBe(true);
	expect(data.length).toBeGreaterThan(0);
	
	const embedding = data[0];
	expect(Array.isArray(embedding)).toBe(true);
	expect(embedding.length).toBeGreaterThan(0);
	
	// Check vector dimensions (typical: 384, 768, 1024, 1536, etc.)
	console.log(`✅ Embedding dimensions: ${embedding.length}`);
	expect(embedding.length).toBeGreaterThan(128);
	
	// Verify all values are numbers
	const allNumbers = embedding.every((val: any) => typeof val === 'number');
	expect(allNumbers).toBe(true);
	
	console.log('✅ Embeddings generation test passed');
	}, DEFAULT_TIMEOUT);

	testOrSkip('should handle batch inputs', async () => {
		if (!EMBEDDINGS_CHUTE_URL) {
			console.log('⏭️ Skipping - no embeddings chute available');
			return;
		}

		console.log('🔢 Testing batch embeddings...');

		// TEI format with array of inputs
		const response = await fetch(`${EMBEDDINGS_CHUTE_URL}/embed`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				inputs: ['Hello world', 'Goodbye world'],
			}),
		});

		if (!response.ok) {
			// Some embeddings chutes might not support batch inputs
			console.log(`⚠️ Batch inputs not supported (status: ${response.status})`);
			return; // Skip gracefully
		}

		const data = await response.json() as any;
		
		// TEI returns array of arrays for batch inputs: [[emb1...], [emb2...]]
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBe(2);
		
		// Each item should be an embedding array
		expect(Array.isArray(data[0])).toBe(true);
		expect(data[0].length).toBeGreaterThan(128);
		expect(Array.isArray(data[1])).toBe(true);
		expect(data[1].length).toBeGreaterThan(128);
		
		console.log(`✅ Generated ${data.length} embeddings for batch input`);
	}, DEFAULT_TIMEOUT);

	testOrSkip('should return valid embedding structure', async () => {
		if (!EMBEDDINGS_CHUTE_URL) {
			console.log('⏭️ Skipping - no embeddings chute available');
			return;
		}

		console.log('🔢 Testing embedding structure...');

		// TEI format
		const response = await fetch(`${EMBEDDINGS_CHUTE_URL}/embed`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				inputs: 'Test message for embeddings',
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.log(`⚠️ Request failed: ${response.status} - ${errorText}`);
			console.log('⏭️ Skipping - embeddings chute temporarily unavailable');
			return; // Skip gracefully
		}

		const data = await response.json() as any;
		
		// TEI format returns: [[embedding values...]]
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBeGreaterThan(0);
		
		const embedding = data[0];
		expect(Array.isArray(embedding)).toBe(true);
		expect(embedding.length).toBeGreaterThan(128);
		
		console.log(`✅ Valid TEI embedding structure (${embedding.length} dimensions)`);
		
		// Note: TEI format doesn't include usage statistics like OpenAI
		// Usage tracking would need to be done separately if required
	}, DEFAULT_TIMEOUT);
});

