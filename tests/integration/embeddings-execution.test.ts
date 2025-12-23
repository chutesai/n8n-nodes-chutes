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
	withRetry,
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

		try {
			const result = await withRetry(async () => {
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
					
					// 404 means endpoint doesn't exist - try another embeddings chute
					if (response.status === 404) {
						throw new Error(`ENDPOINT_NOT_FOUND: 404 - ${errorText}`);
					}
					
					// 502/503 means chute infrastructure is temporarily down
					if (response.status === 502 || response.status === 503) {
						throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
					}
					
					// Other errors
					throw new Error(`API error ${response.status}: ${errorText}`);
				}

				return response;
			}, {
				maxRetries: 5,
				delayMs: 5000,
				category: 'embeddings',
				currentChuteUrl: EMBEDDINGS_CHUTE_URL || undefined,
			});

			// Get embeddings data
			const data = await result.json() as any;
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
		} catch (error) {
			const errorMsg = String(error);
			if (errorMsg.includes('CHUTE_UNAVAILABLE') || 
			    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
			    errorMsg.includes('ENDPOINT_NOT_FOUND')) {
				console.log('⏭️ Skipping - embeddings chute(s) unavailable or endpoint not supported');
				return; // Skip gracefully
			}
			throw error;
		}
	}, DEFAULT_TIMEOUT);

	testOrSkip('should handle batch inputs', async () => {
		if (!EMBEDDINGS_CHUTE_URL) {
			console.log('⏭️ Skipping - no embeddings chute available');
			return;
		}

		console.log('🔢 Testing batch embeddings...');

		try {
			const result = await withRetry(async () => {
				// TEI format with array of inputs
				const response = await fetch(`${EMBEDDINGS_CHUTE_URL}/embed`, {
					method: 'POST',
					headers: getAuthHeaders(),
					body: JSON.stringify({
						inputs: ['Hello world', 'Goodbye world'],
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					
					// 404 means endpoint doesn't exist - try another embeddings chute
					if (response.status === 404) {
						throw new Error(`ENDPOINT_NOT_FOUND: 404 - ${errorText}`);
					}
					
					// 502/503 means chute infrastructure is temporarily down
					if (response.status === 502 || response.status === 503) {
						throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
					}
					
					// Other errors - some chutes might not support batch inputs
					console.log(`⚠️ Batch inputs not supported (status: ${response.status})`);
					throw new Error(`Batch not supported: ${response.status}`);
				}

				return response;
			}, {
				maxRetries: 5,
				delayMs: 5000,
				category: 'embeddings',
				currentChuteUrl: EMBEDDINGS_CHUTE_URL || undefined,
			});

			const data = await result.json() as any;
			
			// TEI returns array of arrays for batch inputs: [[emb1...], [emb2...]]
			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBe(2);
			
			// Each item should be an embedding array
			expect(Array.isArray(data[0])).toBe(true);
			expect(data[0].length).toBeGreaterThan(128);
			expect(Array.isArray(data[1])).toBe(true);
			expect(data[1].length).toBeGreaterThan(128);
			
			console.log(`✅ Generated ${data.length} embeddings for batch input`);
		} catch (error) {
			const errorMsg = String(error);
			if (errorMsg.includes('CHUTE_UNAVAILABLE') || 
			    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
			    errorMsg.includes('ENDPOINT_NOT_FOUND') ||
			    errorMsg.includes('Batch not supported')) {
				console.log('⏭️ Skipping - batch embeddings not supported or chute unavailable');
				return; // Skip gracefully
			}
			throw error;
		}
	}, DEFAULT_TIMEOUT);

	testOrSkip('should return valid embedding structure', async () => {
		if (!EMBEDDINGS_CHUTE_URL) {
			console.log('⏭️ Skipping - no embeddings chute available');
			return;
		}

		console.log('🔢 Testing embedding structure...');

		try {
			const result = await withRetry(async () => {
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
					
					// 404 means endpoint doesn't exist - try another embeddings chute
					if (response.status === 404) {
						throw new Error(`ENDPOINT_NOT_FOUND: 404 - ${errorText}`);
					}
					
					// 502/503 means chute infrastructure is temporarily down
					if (response.status === 502 || response.status === 503) {
						throw new Error(`CHUTE_UNAVAILABLE: ${response.status}`);
					}
					
					throw new Error(`API error ${response.status}: ${errorText}`);
				}

				return response;
			}, {
				maxRetries: 5,
				delayMs: 5000,
				category: 'embeddings',
				currentChuteUrl: EMBEDDINGS_CHUTE_URL || undefined,
			});

			const data = await result.json() as any;
			
			// TEI format returns: [[embedding values...]]
			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
			
			const embedding = data[0];
			expect(Array.isArray(embedding)).toBe(true);
			expect(embedding.length).toBeGreaterThan(128);
			
			console.log(`✅ Valid TEI embedding structure (${embedding.length} dimensions)`);
			
			// Note: TEI format doesn't include usage statistics like OpenAI
			// Usage tracking would need to be done separately if required
		} catch (error) {
			const errorMsg = String(error);
			if (errorMsg.includes('CHUTE_UNAVAILABLE') || 
			    errorMsg.includes('ALL_CHUTES_EXHAUSTED') ||
			    errorMsg.includes('ENDPOINT_NOT_FOUND')) {
				console.log('⏭️ Skipping - embeddings chute(s) unavailable or endpoint not supported');
				return; // Skip gracefully
			}
			throw error;
		}
	}, DEFAULT_TIMEOUT);
});

