/**
 * 🧪 Chat Completion Endpoint Test
 * 
 * Tests whether the /v1/chat/completions endpoint has the same truncation
 * issue as /v1/completions, and compares the results across models.
 */

import 'dotenv/config';

// Load test configuration
const testConfig = {
	apiKey: process.env.CHUTES_API_KEY || '',
	skipRealApiTests: !process.env.CHUTES_API_KEY,
};

interface ModelTestConfig {
	name: string;
	subdomain: string;
	modelId: string;
}

function toSubdomainFromUrl(chuteUrl: string): string {
	const { hostname } = new URL(chuteUrl);
	return hostname.split('.')[0];
}

async function discoverFromWarmedLlmChute(apiKey: string): Promise<ModelTestConfig[]> {
	const warmedChute = process.env.WARMED_LLM_CHUTE;
	if (!warmedChute) {
		return [];
	}

	const subdomain = toSubdomainFromUrl(warmedChute);
	const modelsResponse = await fetch(`${warmedChute.replace(/\/$/, '')}/v1/models`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	});
	if (!modelsResponse.ok) {
		return [];
	}

	const modelsData = (await modelsResponse.json()) as
		| { data?: Array<Record<string, any>> }
		| Array<Record<string, any>>;
	const models = Array.isArray((modelsData as { data?: unknown[] })?.data)
		? (modelsData as { data: Array<Record<string, any>> }).data
		: Array.isArray(modelsData)
			? modelsData
			: [];

	return models
		.filter((model) => typeof model?.id === 'string' && model.id.length > 0)
		.slice(0, 3)
		.map((model) => ({
			name: String(model.name || model.id),
			subdomain,
			modelId: String(model.id),
		}));
}

async function discoverModelsToTest(apiKey: string): Promise<ModelTestConfig[]> {
	const warmedModels = await discoverFromWarmedLlmChute(apiKey);
	if (warmedModels.length > 0) {
		return warmedModels;
	}

	const listResponse = await fetch('https://api.chutes.ai/chutes/?include_public=true&limit=200', {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	});
	if (!listResponse.ok) {
		const infraCodes = new Set([502, 404, 429]);
		if (infraCodes.has(listResponse.status)) {
			console.log(`⚠️  Chute catalog returned ${listResponse.status} — infrastructure unavailable.`);
			return [];
		}
		throw new Error(`Failed to fetch chute catalog: HTTP ${listResponse.status}`);
	}

	const listData = (await listResponse.json()) as { items?: Array<Record<string, any>> };
	const llmChutes = (Array.isArray(listData.items) ? listData.items : [])
		.filter((item) => item?.public && String(item?.standard_template || '').toLowerCase() === 'vllm')
		.filter((item) => typeof item?.slug === 'string' && item.slug.length > 0)
		.slice(0, 60);

	const discovered: ModelTestConfig[] = [];
	for (const chute of llmChutes) {
		if (discovered.length >= 3) {
			break;
		}

		const subdomain = `chutes-${chute.slug}`;
		const modelsResponse = await fetch(`https://${subdomain}.chutes.ai/v1/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		});
		if (!modelsResponse.ok) {
			continue;
		}

		const modelsData = (await modelsResponse.json()) as { data?: Array<Record<string, any>> } | Array<Record<string, any>>;
		const models = Array.isArray((modelsData as { data?: unknown[] })?.data)
			? ((modelsData as { data: Array<Record<string, any>> }).data)
			: (Array.isArray(modelsData) ? modelsData : []);
		const modelId = models.find((model) => typeof model?.id === 'string' && model.id.length > 0)?.id;
		if (!modelId) {
			continue;
		}

		discovered.push({
			name: String(chute.name || chute.slug),
			subdomain,
			modelId,
		});
	}

	return discovered;
}

interface TruncationIndicator {
	found: boolean;
	reason: string;
}

interface ChatTestResult {
	modelName: string;
	success: boolean;
	truncated: boolean;
	truncationIndicators: TruncationIndicator[];
	responseTime: number;
	textLength: number;
	firstChars: string;
	lastChars: string;
	finishReason: string;
	tokens: {
		prompt: number;
		completion: number;
		total: number;
	};
	error?: string;
}

async function testChatCompletion(config: ModelTestConfig): Promise<ChatTestResult> {
	const url = `https://${config.subdomain}.chutes.ai/v1/chat/completions`;
	const userMessage = 'Write a short 3-paragraph story about a robot';

	console.log(`\n${'='.repeat(80)}`);
	console.log(`🧪 TESTING MODEL: ${config.name} (Chat Completion)`);
	console.log(`${'='.repeat(80)}`);
	console.log(`URL: ${url}`);
	console.log(`Model: ${config.modelId}`);
	console.log(`Endpoint: /v1/chat/completions`);

	const requestBody = {
		model: config.modelId,
		messages: [
			{ role: 'user', content: userMessage },
		],
		max_tokens: 1000,
		temperature: 0.7,
		stream: false,
	};

	console.log(`\n📤 REQUEST:`);
	console.log(JSON.stringify(requestBody, null, 2));

	const startTime = Date.now();
	let result: ChatTestResult = {
		modelName: config.name,
		success: false,
		truncated: false,
		truncationIndicators: [],
		responseTime: 0,
		textLength: 0,
		firstChars: '',
		lastChars: '',
		finishReason: '',
		tokens: {
			prompt: 0,
			completion: 0,
			total: 0,
		},
	};

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${testConfig.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		});

		result.responseTime = Date.now() - startTime;

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data: any = await response.json();
		
		// Chat completion uses message.content instead of text
		const generatedText = data.choices?.[0]?.message?.content || '';

		result.success = true;
		result.textLength = generatedText.length;
		result.firstChars = generatedText.substring(0, 50);
		result.lastChars = generatedText.substring(Math.max(0, generatedText.length - 50));
		result.finishReason = data.choices?.[0]?.finish_reason || 'unknown';
		result.tokens = {
			prompt: data.usage?.prompt_tokens || 0,
			completion: data.usage?.completion_tokens || 0,
			total: data.usage?.total_tokens || 0,
		};

		// Check for truncation indicators
		const indicators: TruncationIndicator[] = [];

		// 1. Starts with space?
		if (generatedText.startsWith(' ')) {
			indicators.push({
				found: true,
				reason: 'Text starts with space (likely missing opening)',
			});
		}

		// 2. Starts with lowercase letter?
		const firstNonWhitespace = generatedText.trimStart()[0];
		if (firstNonWhitespace && /[a-z]/.test(firstNonWhitespace)) {
			indicators.push({
				found: true,
				reason: 'Text starts with lowercase letter (missing beginning)',
			});
		}

		// 3. Missing expected story opening?
		const commonOpenings = [
			'once upon a time',
			'in a',
			'there was',
			'the robot',
			'a robot',
			'here',
		];
		const startsWithCommonOpening = commonOpenings.some(opening =>
			generatedText.toLowerCase().trimStart().startsWith(opening)
		);
		if (!startsWithCommonOpening) {
			indicators.push({
				found: true,
				reason: 'Does not start with common story opening',
			});
		}

		// 4. Starts mid-sentence (conjunction or continuation)?
		const midSentenceStarts = [' and ', ' but ', ' or ', ' who ', ' which ', ' that '];
		if (midSentenceStarts.some(start => generatedText.startsWith(start))) {
			indicators.push({
				found: true,
				reason: 'Starts with conjunction/continuation (mid-sentence)',
			});
		}

		result.truncationIndicators = indicators;
		result.truncated = indicators.length > 0;

		// Log results
		console.log(`\n✅ SUCCESS`);
		console.log(`⏱️  Response time: ${result.responseTime}ms`);
		console.log(`📏 Text length: ${result.textLength} characters`);
		console.log(`🔤 First 50 chars: "${result.firstChars}"`);
		console.log(`🔤 Last 50 chars: "${result.lastChars}"`);
		console.log(`🏁 Finish reason: ${result.finishReason}`);
		console.log(`📊 Tokens: ${result.tokens.prompt} prompt + ${result.tokens.completion} completion = ${result.tokens.total} total`);

		if (result.truncated) {
			console.log(`\n🚨 TRUNCATION DETECTED:`);
			indicators.forEach(indicator => {
				console.log(`   ✗ ${indicator.reason}`);
			});
		} else {
			console.log(`\n✅ NO TRUNCATION - Response looks complete!`);
		}

		console.log(`\n📄 FULL TEXT (first 500 chars):`);
		console.log(`${'─'.repeat(80)}`);
		console.log(generatedText.substring(0, 500) + (generatedText.length > 500 ? '...' : ''));
		console.log(`${'─'.repeat(80)}`);

	} catch (error: any) {
		result.success = false;
		result.error = error.message;
		result.responseTime = Date.now() - startTime;

		console.log(`\n❌ ERROR: ${error.message}`);
	}

	return result;
}

describe('🔍 Chat Completion Endpoint Test', () => {
	if (testConfig.skipRealApiTests) {
		it.skip('Skipping real API test - CHUTES_API_KEY not set', () => {});
		return;
	}

	it('Test chat completions endpoint for truncation issues', async () => {
		const MODELS_TO_TEST = await discoverModelsToTest(testConfig.apiKey);
		if (MODELS_TO_TEST.length === 0) {
			console.log('⚠️  No LLM models could be discovered — infrastructure may be unavailable. Skipping.');
			return;
		}

		console.log('\n' + '═'.repeat(80));
		console.log('🚀 TESTING CHAT COMPLETIONS ENDPOINT');
		console.log('═'.repeat(80));
		console.log(`Endpoint: /v1/chat/completions (not /v1/completions)`);
		console.log(`Models to test: ${MODELS_TO_TEST.length}`);
		console.log(`Models: ${MODELS_TO_TEST.map(m => m.name).join(', ')}`);

		// Test all models
		const results: ChatTestResult[] = [];
		for (const modelConfig of MODELS_TO_TEST) {
			const result = await testChatCompletion(modelConfig);
			results.push(result);
		}

		// Summary
		console.log('\n' + '═'.repeat(80));
		console.log('📊 CHAT COMPLETION SUMMARY');
		console.log('═'.repeat(80));

		results.forEach(result => {
			const status = result.success ? '✅' : '❌';
			const truncStatus = result.truncated ? '🚨 TRUNCATED' : '✅ COMPLETE';
			console.log(`${status} ${result.modelName.padEnd(20)} ${truncStatus.padEnd(20)} ${result.responseTime}ms`);
			if (result.error) {
				console.log(`   Error: ${result.error}`);
			}
			if (result.truncated) {
				console.log(`   Indicators: ${result.truncationIndicators.length}`);
				result.truncationIndicators.forEach(indicator => {
					console.log(`     - ${indicator.reason}`);
				});
			}
		});

		console.log('\n' + '═'.repeat(80));
		console.log('🎯 COMPARISON: Chat Completion vs Text Completion');
		console.log('═'.repeat(80));

		const workingModels = results.filter(r => r.success && !r.truncated);
		const truncatedModels = results.filter(r => r.success && r.truncated);
		const failedModels = results.filter(r => !r.success);

		if (workingModels.length > 0) {
			console.log(`✅ Working models (no truncation with chat completion):`);
			workingModels.forEach(r => console.log(`   - ${r.modelName} ✓`));
		}

		if (truncatedModels.length > 0) {
			console.log(`\n🚨 Still truncated with chat completion:`);
			truncatedModels.forEach(r => console.log(`   - ${r.modelName} ✗`));
		}

		if (failedModels.length > 0) {
			console.log(`\n❌ Failed models (API errors):`);
			failedModels.forEach(r => console.log(`   - ${r.modelName}: ${r.error}`));
		}

		console.log('\n' + '═'.repeat(80));
		console.log('💡 RECOMMENDATION');
		console.log('═'.repeat(80));

		if (workingModels.length > truncatedModels.length) {
			console.log('✅ Chat Completion endpoint has BETTER results than Text Completion!');
			console.log('   Recommendation: Make Chat Completion the default method.');
			console.log('   For "complete" operation: Wrap user prompt as { role: "user", content: prompt }');
		} else if (truncatedModels.length > 0 && workingModels.length === 0) {
			console.log('🚨 Chat Completion has the SAME truncation issue as Text Completion.');
			console.log('   This is a Chutes.ai API-wide issue. Report to Chutes.ai support.');
		} else {
			console.log('✅ Chat Completion works well for some models!');
			console.log('   Use chat completion where possible, with proper error handling.');
		}

		console.log('\n' + '═'.repeat(80));

		if (!results.some(r => r.success)) {
			const infraPattern = /^HTTP (502|404|429):/;
			const allInfraErrors = failedModels.length > 0 && failedModels.every(
				(r) => r.error && infraPattern.test(r.error),
			);
			if (allInfraErrors) {
				console.log(
					`\n⚠️  All ${failedModels.length} LLM chute attempts returned infrastructure errors.` +
					' Skipping — no LLM chutes are available right now.',
				);
				return;
			}
		}

		expect(results.some(r => r.success)).toBe(true);
	}, 180000); // 3 minute timeout for multiple API calls
});

