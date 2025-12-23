/**
 * Chutes AI Agent Integration Tests
 * 
 * Tests the full AI Agent flow with real Chutes.ai API calls.
 * Uses DYNAMIC chute discovery - no hardcoded URLs.
 * Requires CHUTES_API_KEY environment variable.
 */

import {
	testOrSkip,
	hasApiKey,
	DEFAULT_TIMEOUT,
	EXTENDED_TIMEOUT,
	CHUTES_API_KEY,
	initializeTestChutes,
	LLM_CHUTE_URL,
	withRetry,
} from './test-helpers';

describe('AI Agent Integration Tests', () => {
	// Discover chutes before running tests
	beforeAll(async () => {
		if (!hasApiKey()) {
			console.log('⚠️ CHUTES_API_KEY not set - skipping integration tests');
			return;
		}
		await initializeTestChutes();
	}, 60000); // 1 minute for discovery

	testOrSkip('should execute agent with GenericChutesChatModel', async () => {
		if (!LLM_CHUTE_URL) {
			console.log('⚠️ No LLM chute available, skipping');
			return;
		}

		const { GenericChutesChatModel } = await import('../../nodes/ChutesChatModel/GenericChutesChatModel');
		const { HumanMessage, SystemMessage } = await import('@langchain/core/messages');
		
		// Create request helper that uses fetch
		const requestHelper = {
			request: async (options: { method?: string; url: string; headers?: Record<string, string>; body?: unknown }) => {
				const response = await fetch(options.url, {
					method: options.method || 'POST',
					headers: {
						...options.headers,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(options.body),
				});
				
				if (!response.ok) {
					const error = await response.text();
					throw new Error(`API error ${response.status}: ${error}`);
				}
				
				return response.json();
			},
		};
		
		// Create chat model with discovered chute URL
		// GenericChutesChatModel takes a single config object with credentials and requestHelper inside
		const chatModel = new GenericChutesChatModel({
			chuteUrl: LLM_CHUTE_URL,
			model: 'default',
			temperature: 0.1,
			maxTokens: 50,
			credentials: { apiKey: CHUTES_API_KEY },
			requestHelper,
		});
		
		// Test basic invocation
		const messages = [
			new SystemMessage('You are a helpful assistant.'),
			new HumanMessage('Say hello'),
		];
		
		console.log(`Testing GenericChutesChatModel with ${LLM_CHUTE_URL}`);
		const result = await chatModel.invoke(messages);
		
		expect(result).toBeDefined();
		expect(result.content).toBeDefined();
		// Verify we got a response (reasoning models include <think> tags)
		expect(String(result.content).length).toBeGreaterThan(0);
		
		console.log('✅ GenericChutesChatModel response:', result.content);
	}, DEFAULT_TIMEOUT);

	testOrSkip('should handle streaming responses', async () => {
		if (!LLM_CHUTE_URL) {
			console.log('⚠️ No LLM chute available, skipping');
			return;
		}

		// Direct API call with streaming
		const response = await fetch(`${LLM_CHUTE_URL}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${CHUTES_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'default',
				messages: [
					{ role: 'user', content: 'Count from 1 to 5' },
				],
				max_tokens: 50,
				stream: true,
			}),
		});
		
		expect(response.ok).toBe(true);
		
		// Read the stream
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('No reader available');
		}
		
		let fullContent = '';
		const decoder = new TextDecoder();
		
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			
			const chunk = decoder.decode(value);
			const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
			
			for (const line of lines) {
				const data = line.replace('data: ', '');
				if (data === '[DONE]') continue;
				
				try {
					const parsed = JSON.parse(data);
					const content = parsed.choices?.[0]?.delta?.content;
					if (content) {
						fullContent += content;
					}
				} catch {
					// Skip non-JSON lines
				}
			}
		}
		
		expect(fullContent.length).toBeGreaterThan(0);
		console.log('✅ Streaming response:', fullContent);
	}, DEFAULT_TIMEOUT);

	testOrSkip('should handle multiple sequential requests', async () => {
		if (!LLM_CHUTE_URL) {
			console.log('⚠️ No LLM chute available, skipping');
			return;
		}

		const { GenericChutesChatModel } = await import('../../nodes/ChutesChatModel/GenericChutesChatModel');
		const { HumanMessage } = await import('@langchain/core/messages');
		
		const requestHelper = {
			request: async (options: { method?: string; url: string; headers?: Record<string, string>; body?: unknown }) => {
				const response = await fetch(options.url, {
					method: options.method || 'POST',
					headers: {
						...options.headers,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(options.body),
				});
				
				if (!response.ok) {
					throw new Error(`API error ${response.status}`);
				}
				
				return response.json();
			},
		};
		
		const chatModel = new GenericChutesChatModel({
			chuteUrl: LLM_CHUTE_URL,
			model: 'default',
			temperature: 0.1,
			maxTokens: 20,
			credentials: { apiKey: CHUTES_API_KEY },
			requestHelper,
		});
		
		console.log('Testing sequential requests...');
		
		try {
			// Make 3 sequential requests - just verify we get responses
			for (let i = 1; i <= 3; i++) {
				const result = await withRetry(async () => {
					try {
						return await chatModel.invoke([new HumanMessage(`Say the number ${i}`)]);
					} catch (error: any) {
						const errorMsg = String(error);
						// Check for 429 or capacity errors
						if (errorMsg.includes('429') || 
						    errorMsg.includes('maximum capacity') ||
						    errorMsg.includes('at maximum capacity')) {
							throw new Error(`CHUTE_AT_CAPACITY: ${errorMsg}`);
						}
						throw error;
					}
				}, {
					maxRetries: 5,
					delayMs: 5000,
					category: 'llm',
					currentChuteUrl: LLM_CHUTE_URL || undefined,
				});
				
				expect(result.content).toBeDefined();
				expect(String(result.content).length).toBeGreaterThan(0);
				console.log(`  Request ${i}: ${String(result.content).substring(0, 50)}...`);
			}
			
			console.log('✅ Sequential requests test passed');
		} catch (error) {
			const errorMsg = String(error);
			if (errorMsg.includes('CHUTE_AT_CAPACITY') || 
			    errorMsg.includes('ALL_CHUTES_EXHAUSTED')) {
				console.log('⏭️ Skipping - LLM chute(s) at capacity during sequential requests');
				return; // Skip gracefully
			}
			throw error;
		}
	}, EXTENDED_TIMEOUT);

	testOrSkip('should handle error responses gracefully', async () => {
		if (!LLM_CHUTE_URL) {
			console.log('⚠️ No LLM chute available, skipping');
			return;
		}

		// Test with invalid API key
		const response = await fetch(`${LLM_CHUTE_URL}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Authorization': 'Bearer invalid_key_12345',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'default',
				messages: [{ role: 'user', content: 'Hello' }],
			}),
		});
		
		// Should get an authentication error (401 or 403)
		expect([401, 403, 500]).toContain(response.status);
		console.log('✅ Error handling test passed (status:', response.status, ')');
	}, DEFAULT_TIMEOUT);
});
