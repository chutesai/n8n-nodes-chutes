/**
 * 🧪 Alternative Model Truncation Test
 * 
 * Tests whether alternative models (DeepSeek-V3, Qwen2.5, Llama-3) have
 * the same truncation issue as DeepSeek-R1.
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
	endpoint: string;
}

async function discoverModelsToTest(apiKey: string): Promise<ModelTestConfig[]> {
	const listResponse = await fetch('https://api.chutes.ai/chutes/?include_public=true&limit=200', {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	});
	if (!listResponse.ok) {
		throw new Error(`Failed to fetch chute catalog: HTTP ${listResponse.status}`);
	}

	const listData = (await listResponse.json()) as { items?: Array<Record<string, any>> };
	const llmChutes = (Array.isArray(listData.items) ? listData.items : [])
		.filter((item) => item?.public && String(item?.standard_template || '').toLowerCase() === 'vllm')
		.filter((item) => typeof item?.slug === 'string' && item.slug.length > 0)
		.slice(0, 20);

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
			endpoint: '/v1/completions',
		});
	}

	return discovered;
}

interface TruncationIndicator {
	found: boolean;
	reason: string;
}

interface ModelTestResult {
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

async function testModel(config: ModelTestConfig): Promise<ModelTestResult> {
	const url = `https://${config.subdomain}.chutes.ai${config.endpoint}`;
	const prompt = 'Write a short 3-paragraph story about a robot';

	console.log(`\n${'='.repeat(80)}`);
	console.log(`🧪 TESTING MODEL: ${config.name}`);
	console.log(`${'='.repeat(80)}`);
	console.log(`URL: ${url}`);
	console.log(`Model: ${config.modelId}`);

	const requestBody = {
		model: config.modelId,
		prompt,
		max_tokens: 1000,
		temperature: 0.7,
		stream: false,
	};

	const startTime = Date.now();
	let result: ModelTestResult = {
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
		const generatedText = data.choices?.[0]?.text || '';

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

		console.log(`\n📄 FULL TEXT (first 300 chars):`);
		console.log(`${'─'.repeat(80)}`);
		console.log(generatedText.substring(0, 300) + (generatedText.length > 300 ? '...' : ''));
		console.log(`${'─'.repeat(80)}`);

	} catch (error: any) {
		result.success = false;
		result.error = error.message;
		result.responseTime = Date.now() - startTime;

		console.log(`\n❌ ERROR: ${error.message}`);
	}

	return result;
}

describe('🔍 Alternative Model Truncation Test', () => {
	if (testConfig.skipRealApiTests) {
		it.skip('Skipping real API test - CHUTES_API_KEY not set', () => {});
		return;
	}

	it('Test all alternative models for truncation issues', async () => {
		const MODELS_TO_TEST = await discoverModelsToTest(testConfig.apiKey);
		expect(MODELS_TO_TEST.length).toBeGreaterThan(0);

		console.log('\n' + '═'.repeat(80));
		console.log(' TESTING ALTERNATIVE MODELS FOR TRUNCATION');
		console.log('═'.repeat(80));
		console.log(`Models to test: ${MODELS_TO_TEST.length}`);
		console.log(`Models: ${MODELS_TO_TEST.map(m => m.name).join(', ')}`);

		// Test all models
		const results: ModelTestResult[] = [];
		for (const modelConfig of MODELS_TO_TEST) {
			const result = await testModel(modelConfig);
			results.push(result);
		}

		// Summary
		console.log('\n' + '═'.repeat(80));
		console.log('📊 SUMMARY');
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
		console.log('🎯 RECOMMENDATIONS');
		console.log('═'.repeat(80));

		const workingModels = results.filter(r => r.success && !r.truncated);
		const truncatedModels = results.filter(r => r.success && r.truncated);
		const failedModels = results.filter(r => !r.success);

		if (workingModels.length > 0) {
			console.log(`✅ Working models (no truncation):`);
			workingModels.forEach(r => console.log(`   - ${r.modelName}`));
		}

		if (truncatedModels.length > 0) {
			console.log(`\n🚨 Truncated models (avoid these):`);
			truncatedModels.forEach(r => console.log(`   - ${r.modelName}`));
		}

		if (failedModels.length > 0) {
			console.log(`\n❌ Failed models (API errors):`);
			failedModels.forEach(r => console.log(`   - ${r.modelName}: ${r.error}`));
		}

		if (workingModels.length === 0 && truncatedModels.length > 0) {
			console.log('\n⚠️  All tested models show truncation - this appears to be a Chutes.ai API issue!');
			console.log('   Recommendation: Report to Chutes.ai support');
		}

		console.log('\n' + '═'.repeat(80));

		// Test passes if at least one model works
		expect(results.some(r => r.success)).toBe(true);
	}, 180000); // 3 minute timeout for multiple API calls
});

