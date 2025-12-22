/**
 * Test: LLM Chutes - Comprehensive Real-World Filtering
 * 
 * Verifies that all LLM chutes from the Chutes.ai playground are correctly
 * included based on the vllm template and public status.
 * 
 * Based on REAL chutes from user screenshots (Dec 2025):
 * - Qwen (multiple variants)
 * - DeepSeek (V3, V3.1, V3.2, R1, etc.)
 * - Tngtech (Chimera variants)
 * - OpenAI (gpt-oss variants)
 * - Mistralai (Devstral, Mistral-Small)
 * - NousResearch (Hermes variants)
 * - Unsloth (Gemma, Mistral variants)
 * - Zai-org (GLM variants)
 * - Moonshotai (Kimi variants)
 * - And many more...
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on REAL LLM chutes from Chutes.ai (from user screenshots)
const mockChutes = [
	// === Should be INCLUDED - Public vLLM chutes ===
	
	// Qwen variants
	{
		chute_id: '1',
		name: 'Qwen/Qwen3-32B',
		slug: 'qwen-qwen3-32b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Qwen3-32B LLM',
	},
	{
		chute_id: '2',
		name: 'Qwen/Qwen2.5-72B-Instruct',
		slug: 'qwen-qwen2-5-72b-instruct',
		standard_template: 'vllm',
		public: true,
		tagline: 'Large language model',
	},
	{
		chute_id: '3',
		name: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
		slug: 'qwen-qwen3-235b-a22b-instruct-2507',
		standard_template: 'vllm',
		public: true,
		tagline: 'MoE language model',
	},
	{
		chute_id: '4',
		name: 'Qwen/Qwen3-14B',
		slug: 'qwen-qwen3-14b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Qwen3-14B',
	},
	
	// DeepSeek variants
	{
		chute_id: '5',
		name: 'deepseek-ai/DeepSeek-V3',
		slug: 'deepseek-ai-deepseek-v3',
		standard_template: 'vllm',
		public: true,
		tagline: 'DeepSeek-V3 LLM',
	},
	{
		chute_id: '6',
		name: 'deepseek-ai/DeepSeek-V3.1',
		slug: 'deepseek-ai-deepseek-v3-1',
		standard_template: 'vllm',
		public: true,
		tagline: 'DeepSeek-V3.1 LLM',
	},
	{
		chute_id: '7',
		name: 'deepseek-ai/DeepSeek-V3.2',
		slug: 'deepseek-ai-deepseek-v3-2',
		standard_template: 'vllm',
		public: true,
		tagline: 'DeepSeek-V3.2 LLM',
	},
	{
		chute_id: '8',
		name: 'deepseek-ai/DeepSeek-R1',
		slug: 'deepseek-ai-deepseek-r1',
		standard_template: 'vllm',
		public: true,
		tagline: 'Reasoning model',
	},
	{
		chute_id: '9',
		name: 'deepseek-ai/DeepSeek-R1-0528',
		slug: 'deepseek-ai-deepseek-r1-0528',
		standard_template: 'vllm',
		public: true,
		tagline: 'DeepSeek-R1-0528',
	},
	
	// Tngtech Chimera variants
	{
		chute_id: '10',
		name: 'tngtech/DeepSeek-TNG-R1T2-Chimera',
		slug: 'tngtech-deepseek-tng-r1t2-chimera',
		standard_template: 'vllm',
		public: true,
		tagline: 'DeepSeek-TNG-R1T2-Chimera LLM',
	},
	{
		chute_id: '11',
		name: 'tngtech/DeepSeek-R1T-Chimera',
		slug: 'tngtech-deepseek-r1t-chimera',
		standard_template: 'vllm',
		public: true,
		tagline: 'Chimera reasoning model',
	},
	
	// OpenAI OSS variants
	{
		chute_id: '12',
		name: 'openai/gpt-oss-120b',
		slug: 'openai-gpt-oss-120b',
		standard_template: 'vllm',
		public: true,
		tagline: 'GPT OSS 120B',
	},
	{
		chute_id: '13',
		name: 'openai/gpt-oss-20b',
		slug: 'openai-gpt-oss-20b',
		standard_template: 'vllm',
		public: true,
		tagline: 'GPT OSS 20B',
	},
	
	// Chutesai/Mistralai variants
	{
		chute_id: '14',
		name: 'chutesai/Mistral-Small-3.1-24B-Instruct-2503',
		slug: 'chutesai-mistral-small-3-1-24b-instruct-2503',
		standard_template: 'vllm',
		public: true,
		tagline: 'Mistral-Small-3.1-24B-Instruct-2503 LLM',
	},
	{
		chute_id: '15',
		name: 'chutesai/Mistral-Small-3.2-24B-Instruct-2506',
		slug: 'chutesai-mistral-small-3-2-24b-instruct-2506',
		standard_template: 'vllm',
		public: true,
		tagline: 'Mistral model',
	},
	{
		chute_id: '16',
		name: 'mistralai/Devstral-2-123B-Instruct-2512',
		slug: 'mistralai-devstral-2-123b-instruct-2512',
		standard_template: 'vllm',
		public: true,
		tagline: 'Devstral coding model',
	},
	
	// NousResearch Hermes variants
	{
		chute_id: '17',
		name: 'NousResearch/Hermes-4-70B',
		slug: 'nousresearch-hermes-4-70b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Hermes-4-70B LLM',
	},
	{
		chute_id: '18',
		name: 'NousResearch/Hermes-4-405B-FP8',
		slug: 'nousresearch-hermes-4-405b-fp8',
		standard_template: 'vllm',
		public: true,
		tagline: 'Hermes-4-405B-FP8 LLM',
	},
	{
		chute_id: '19',
		name: 'NousResearch/Hermes-4-14B',
		slug: 'nousresearch-hermes-4-14b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Hermes-4-14B',
	},
	{
		chute_id: '20',
		name: 'NousResearch/Hermes-4.3-36B',
		slug: 'nousresearch-hermes-4-3-36b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Hermes-4.3-36B',
	},
	
	// Unsloth variants
	{
		chute_id: '21',
		name: 'unsloth/gemma-3-4b-it',
		slug: 'unsloth-gemma-3-4b-it',
		standard_template: 'vllm',
		public: true,
		tagline: 'Gemma-3-4b-it',
	},
	{
		chute_id: '22',
		name: 'unsloth/gemma-3-27b-it',
		slug: 'unsloth-gemma-3-27b-it',
		standard_template: 'vllm',
		public: true,
		tagline: 'Gemma-3-27b-it',
	},
	{
		chute_id: '23',
		name: 'unsloth/gemma-3-12b-it',
		slug: 'unsloth-gemma-3-12b-it',
		standard_template: 'vllm',
		public: true,
		tagline: 'Gemma model',
	},
	{
		chute_id: '24',
		name: 'unsloth/Mistral-Nemo-Instruct-2407',
		slug: 'unsloth-mistral-nemo-instruct-2407',
		standard_template: 'vllm',
		public: true,
		tagline: 'Mistral-Nemo-Instruct-2407 LLM',
	},
	{
		chute_id: '25',
		name: 'unsloth/Mistral-Small-24B-Instruct-2501',
		slug: 'unsloth-mistral-small-24b-instruct-2501',
		standard_template: 'vllm',
		public: true,
		tagline: 'Mistral-Small model',
	},
	
	// Zai-org GLM variants
	{
		chute_id: '26',
		name: 'zai-org/GLM-4.6',
		slug: 'zai-org-glm-4-6',
		standard_template: 'vllm',
		public: true,
		tagline: 'GLM-4.6 LLM',
	},
	{
		chute_id: '27',
		name: 'zai-org/GLM-4.5-Air',
		slug: 'zai-org-glm-4-5-air',
		standard_template: 'vllm',
		public: true,
		tagline: 'GLM-4.5-Air',
	},
	{
		chute_id: '28',
		name: 'zai-org/GLM-4.6-TEE',
		slug: 'zai-org-glm-4-6-tee',
		standard_template: 'vllm',
		public: true,
		tagline: 'GLM-4.6-TEE',
	},
	{
		chute_id: '29',
		name: 'zai-org/GLM-4.5',
		slug: 'zai-org-glm-4-5',
		standard_template: 'vllm',
		public: true,
		tagline: 'GLM-4.5',
	},
	
	// Moonshotai Kimi variants
	{
		chute_id: '30',
		name: 'moonshotai/Kimi-K2-Instruct-0905',
		slug: 'moonshotai-kimi-k2-instruct-0905',
		standard_template: 'vllm',
		public: true,
		tagline: 'Kimi-K2-Instruct-0905 LLM',
	},
	{
		chute_id: '31',
		name: 'moonshotai/Kimi-K2-Thinking',
		slug: 'moonshotai-kimi-k2-thinking',
		standard_template: 'vllm',
		public: true,
		tagline: 'Kimi-K2-Thinking',
	},
	
	// Other notable LLM variants
	{
		chute_id: '32',
		name: 'Alibaba-NLP/Tongyi-DeepResearch-30B-A3B',
		slug: 'alibaba-nlp-tongyi-deepresearch-30b-a3b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Tongyi-DeepResearch-30B-A3B',
	},
	{
		chute_id: '33',
		name: 'MiniMaxAI/MiniMax-M2',
		slug: 'minimaxai-minimax-m2',
		standard_template: 'vllm',
		public: true,
		tagline: 'MiniMax-M2',
	},
	{
		chute_id: '34',
		name: 'ArliAI/QwQ-32B-ArliAI-RpR-v1',
		slug: 'arliai-qwq-32b-arliai-rpr-v1',
		standard_template: 'vllm',
		public: true,
		tagline: 'QwQ-32B-ArliAI-RpR-v1',
	},
	{
		chute_id: '35',
		name: 'rednote-hilab/dots.ocr',
		slug: 'rednote-hilab-dots-ocr',
		standard_template: 'vllm',
		public: true,
		tagline: 'dots.ocr LLM',
	},
	{
		chute_id: '36',
		name: 'gradients-io-tournaments/Gradients-Instruct-V2',
		slug: 'gradients-io-tournaments-gradients-instruct-v2',
		standard_template: 'vllm',
		public: true,
		tagline: 'Gradients-Instruct-V2',
	},
	{
		chute_id: '37',
		name: 'diagonalge/grads32b-iteration8',
		slug: 'diagonalge-grads32b-iteration8',
		standard_template: 'vllm',
		public: true,
		tagline: 'grads32b-iteration8',
	},
	
	// === Should be EXCLUDED - Non-LLM chutes ===
	
	// Image generation chute
	{
		chute_id: '100',
		name: 'flux-1-dev',
		slug: 'flux-1-dev',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Image generation model',
	},
	
	// Video generation chute
	{
		chute_id: '101',
		name: 'hunyuan-video-3',
		slug: 'hunyuan-video-3',
		standard_template: null,
		public: true,
		tagline: 'Video generation model',
	},
	
	// Embedding chute
	{
		chute_id: '102',
		name: 'BAAI/bge-large-en-v1.5',
		slug: 'baai-bge-large-en-v1-5',
		standard_template: 'tei',
		public: true,
		tagline: 'Text embedding model',
	},
	
	// Private LLM chute (should be excluded)
	{
		chute_id: '103',
		name: 'private-user/private-llm',
		slug: 'private-user-private-llm',
		standard_template: 'vllm',
		public: false,
		tagline: 'Private language model',
	},
];

describe('LLM Chutes - Comprehensive Real-World Filtering', () => {
	let mockContext: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-key' }),
			helpers: {
				request: jest.fn().mockResolvedValue({
					total: mockChutes.length,
					items: mockChutes,
				}),
			} as any,
		};
	});

	test('should include all public Qwen LLM variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://qwen-qwen3-32b.chutes.ai');
		expect(slugs).toContain('https://qwen-qwen2-5-72b-instruct.chutes.ai');
		expect(slugs).toContain('https://qwen-qwen3-235b-a22b-instruct-2507.chutes.ai');
		expect(slugs).toContain('https://qwen-qwen3-14b.chutes.ai');
	});

	test('should include all public DeepSeek LLM variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://deepseek-ai-deepseek-v3.chutes.ai');
		expect(slugs).toContain('https://deepseek-ai-deepseek-v3-1.chutes.ai');
		expect(slugs).toContain('https://deepseek-ai-deepseek-v3-2.chutes.ai');
		expect(slugs).toContain('https://deepseek-ai-deepseek-r1.chutes.ai');
		expect(slugs).toContain('https://deepseek-ai-deepseek-r1-0528.chutes.ai');
	});

	test('should include all public Tngtech Chimera variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://tngtech-deepseek-tng-r1t2-chimera.chutes.ai');
		expect(slugs).toContain('https://tngtech-deepseek-r1t-chimera.chutes.ai');
	});

	test('should include all public NousResearch Hermes variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://nousresearch-hermes-4-70b.chutes.ai');
		expect(slugs).toContain('https://nousresearch-hermes-4-405b-fp8.chutes.ai');
		expect(slugs).toContain('https://nousresearch-hermes-4-14b.chutes.ai');
		expect(slugs).toContain('https://nousresearch-hermes-4-3-36b.chutes.ai');
	});

	test('should include all public Mistral variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://chutesai-mistral-small-3-1-24b-instruct-2503.chutes.ai');
		expect(slugs).toContain('https://chutesai-mistral-small-3-2-24b-instruct-2506.chutes.ai');
		expect(slugs).toContain('https://mistralai-devstral-2-123b-instruct-2512.chutes.ai');
		expect(slugs).toContain('https://unsloth-mistral-nemo-instruct-2407.chutes.ai');
		expect(slugs).toContain('https://unsloth-mistral-small-24b-instruct-2501.chutes.ai');
	});

	test('should include all public Gemma variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://unsloth-gemma-3-4b-it.chutes.ai');
		expect(slugs).toContain('https://unsloth-gemma-3-27b-it.chutes.ai');
		expect(slugs).toContain('https://unsloth-gemma-3-12b-it.chutes.ai');
	});

	test('should include all public GLM variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://zai-org-glm-4-6.chutes.ai');
		expect(slugs).toContain('https://zai-org-glm-4-5-air.chutes.ai');
		expect(slugs).toContain('https://zai-org-glm-4-6-tee.chutes.ai');
		expect(slugs).toContain('https://zai-org-glm-4-5.chutes.ai');
	});

	test('should include OpenAI OSS variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://openai-gpt-oss-120b.chutes.ai');
		expect(slugs).toContain('https://openai-gpt-oss-20b.chutes.ai');
	});

	test('should include Kimi variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://moonshotai-kimi-k2-instruct-0905.chutes.ai');
		expect(slugs).toContain('https://moonshotai-kimi-k2-thinking.chutes.ai');
	});

	test('should include other notable LLM variants', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://alibaba-nlp-tongyi-deepresearch-30b-a3b.chutes.ai');
		expect(slugs).toContain('https://minimaxai-minimax-m2.chutes.ai');
		expect(slugs).toContain('https://arliai-qwq-32b-arliai-rpr-v1.chutes.ai');
		expect(slugs).toContain('https://rednote-hilab-dots-ocr.chutes.ai');
		expect(slugs).toContain('https://gradients-io-tournaments-gradients-instruct-v2.chutes.ai');
		expect(slugs).toContain('https://diagonalge-grads32b-iteration8.chutes.ai');
	});

	test('should exclude non-LLM chutes (image, video, embedding)', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://flux-1-dev.chutes.ai');
		expect(slugs).not.toContain('https://hunyuan-video-3.chutes.ai');
		expect(slugs).not.toContain('https://baai-bge-large-en-v1-5.chutes.ai');
	});

	test('should exclude private LLM chutes', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://private-user-private-llm.chutes.ai');
	});

	test('should return exactly 37 public LLM chutes', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		expect(result.length).toBe(37);
	});

	test('all returned chutes should have vllm template', async () => {
		const result = await loadChutes.getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		// Verify by checking the mock data
		const llmChuteIds = result.map(c => String(c.value).split('//')[1].split('.')[0]);
		const allVllm = mockChutes
			.filter(c => llmChuteIds.some(slug => c.slug === slug))
			.every(c => c.standard_template === 'vllm' && c.public === true);

		expect(allVllm).toBe(true);
	});
});

