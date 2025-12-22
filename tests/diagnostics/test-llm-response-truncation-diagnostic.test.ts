/**
 * DIAGNOSTIC: Test LLM response truncation with dynamically warmed chute
 * This diagnostic test helps identify if API responses are being truncated
 * by analyzing response patterns like leading spaces or incomplete sentences.
 * 
 * MODEL-AGNOSTIC: Uses whatever LLM chute is currently warmed from global setup.
 * Purpose: Research/debugging only - NOT for CI/CD automation.
 */

import * as dotenv from 'dotenv';
import { getTestConfig } from '../config/test-config';

dotenv.config();

describe('🔍 LLM Response Truncation Diagnostic', () => {
	const testConfig = getTestConfig();
	const apiKey = testConfig.apiKey;
	const LLM_CHUTE_URL = process.env.WARMED_LLM_CHUTE || null; // Use dynamically warmed chute

	if (testConfig.skipRealApiTests) {
		test.skip('Skipping real API tests (no API key)', () => {});
		return;
	}

	// Skip if no LLM chute available
	const testOrSkip = LLM_CHUTE_URL ? test : test.skip;

	testOrSkip('Detect response truncation with current LLM chute', async () => {
		if (!LLM_CHUTE_URL) {
			console.log('⏭️  Skipping - no LLM chute available');
			return;
		}
		
		const url = `${LLM_CHUTE_URL}/v1/completions`;
		
		console.log('\n🔧 TEST CONFIGURATION:');
		console.log('URL:', url);
		console.log('Chute:', LLM_CHUTE_URL.split('//')[1]?.split('.')[0] || 'unknown');
		console.log('Max tokens: 1000');
		console.log('Stream: false');

		const requestBody = {
			model: null, // Chutes API convention: null for chute URLs
			prompt: 'Write a short 3-paragraph story about a robot',
			max_tokens: 1000,
			temperature: 0.7,
			stream: false,
		};

		console.log('\n📤 REQUEST BODY:');
		console.log(JSON.stringify(requestBody, null, 2));

		const startTime = Date.now();
		
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify(requestBody),
		});

		const endTime = Date.now();
		const duration = endTime - startTime;

		console.log('\n⏱️  RESPONSE TIME:', duration, 'ms');
		console.log('📊 Response status:', response.status);
		console.log('📊 Response status text:', response.statusText);

		// Log ALL response headers
		console.log('\n📋 RESPONSE HEADERS:');
		response.headers.forEach((value, key) => {
			console.log(`  ${key}: ${value}`);
		});

		expect(response.status).toBe(200);

		// Get raw response text first
		const rawText = await response.text();
		console.log('\n📄 RAW RESPONSE LENGTH:', rawText.length, 'bytes');
		console.log('📄 First 200 chars of raw response:');
		console.log(JSON.stringify(rawText.substring(0, 200)));

		// Parse as JSON
		const data = JSON.parse(rawText);

		console.log('\n📦 PARSED JSON STRUCTURE:');
		console.log('  - id:', data.id);
		console.log('  - object:', data.object);
		console.log('  - model:', data.model);
		console.log('  - choices length:', data.choices?.length);

		const generatedText = data.choices?.[0]?.text || '';
		const finishReason = data.choices?.[0]?.finish_reason;

		console.log('\n📝 GENERATED TEXT ANALYSIS:');
		console.log('  - Text length:', generatedText.length, 'characters');
		console.log('  - Text byte length:', Buffer.from(generatedText).length, 'bytes');
		console.log('  - Finish reason:', finishReason);
		console.log('  - Starts with space?', generatedText.startsWith(' '));
		console.log('  - Starts with lowercase?', generatedText.length > 0 && generatedText[0] === generatedText[0].toLowerCase());
		console.log('  - First character code:', generatedText.charCodeAt(0));
		console.log('  - First 10 characters:', JSON.stringify(generatedText.substring(0, 10)));
		console.log('  - Last 10 characters:', JSON.stringify(generatedText.substring(generatedText.length - 10)));

		// Check for BOM (Byte Order Mark)
		const hasBOM = rawText.charCodeAt(0) === 0xFEFF;
		console.log('  - Has BOM?', hasBOM);

		// Check for thinking tags
		const hasOpenThink = generatedText.includes('<think>');
		const hasCloseThink = generatedText.includes('</think>');
		console.log('  - Contains <think>?', hasOpenThink);
		console.log('  - Contains </think>?', hasCloseThink);

		if (hasOpenThink) {
			const thinkStart = generatedText.indexOf('<think>');
			const thinkEnd = generatedText.indexOf('</think>');
			console.log('  - <think> position:', thinkStart);
			console.log('  - </think> position:', thinkEnd);
			if (thinkStart > 0) {
				console.log('  - Text before <think>:', JSON.stringify(generatedText.substring(0, thinkStart)));
			}
		}

		// Print first 500 characters
		console.log('\n📄 FIRST 500 CHARACTERS OF GENERATED TEXT:');
		console.log('═'.repeat(80));
		console.log(generatedText.substring(0, 500));
		console.log('═'.repeat(80));

		// Print last 500 characters
		console.log('\n📄 LAST 500 CHARACTERS OF GENERATED TEXT:');
		console.log('═'.repeat(80));
		console.log(generatedText.substring(generatedText.length - 500));
		console.log('═'.repeat(80));

		// Token usage
		console.log('\n📊 TOKEN USAGE:');
		console.log('  - Prompt tokens:', data.usage?.prompt_tokens);
		console.log('  - Completion tokens:', data.usage?.completion_tokens);
		console.log('  - Total tokens:', data.usage?.total_tokens);

		// TRUNCATION DETECTION
		console.log('\n⚠️  TRUNCATION ANALYSIS:');
		const truncationIndicators = [];
		
		if (generatedText.startsWith(' ')) {
			truncationIndicators.push('✗ Starts with space (likely missing opening)');
		}
		
		if (generatedText.length > 0 && generatedText[0] === generatedText[0].toLowerCase() && !/^[0-9(]/.test(generatedText[0])) {
			truncationIndicators.push('✗ Starts with lowercase letter (missing beginning)');
		}
		
		if (!hasOpenThink && hasCloseThink) {
			truncationIndicators.push('✗ Has </think> but no <think> (beginning truncated)');
		}
		
		if (generatedText.includes('<think>') && generatedText.indexOf('<think>') > 10) {
			truncationIndicators.push('✗ <think> tag appears after position 10 (text before it is missing)');
		}

		if (truncationIndicators.length === 0) {
			console.log('✅ NO TRUNCATION DETECTED - Response appears complete!');
		} else {
			console.log('🚨 TRUNCATION DETECTED:');
			truncationIndicators.forEach(indicator => console.log(`   ${indicator}`));
		}

		// Full JSON for inspection
		console.log('\n📦 FULL RESPONSE JSON:');
		console.log(JSON.stringify(data, null, 2));

	}, 120000); // 120 second timeout for DeepSeek-R1 (complex reasoning can take time)
});

