/**
 * Test: Content Moderation Chutes - Top 20 Model Families
 * 
 * Verifies that content moderation chutes from the top 20 model families
 * are correctly included based on research-backed naming patterns.
 * 
 * Based on top 20 open source content moderation models (Dec 2025):
 * - LLM-Based Safety Guards: Llama Guard, ShieldGemma, Granite Guardian, WildGuard, NeMo, GPT-OSS-Safeguard
 * - Text Toxicity/Hate Speech: Detoxify, ToxicBERT, HateBERT, Perspective, Unitary
 * - Image/NSFW Detection: NSFW Detection, NudeNet, CLIP-based, Safety Checker
 * - Prompt Security: Prompt Guard, Rebuff, LlamaFirewall
 * - Specialized: CodeShield
 * 
 * Note: Moderation primarily uses template-based filtering (`moderation`),
 * but keyword fallbacks ensure comprehensive coverage.
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on top 20 content moderation model families
const mockChutes = [
	// === Should be INCLUDED - Top 20 Content Moderation Model Families ===
	
	// LLM-Based Safety Guards (with moderation template)
	{
		chute_id: 'mod1',
		name: 'llama-guard-4-12b',
		slug: 'llama-guard-4-12b',
		standard_template: 'moderation',
		public: true,
		tagline: 'Multimodal safety',
		description: 'Meta, 12B multimodal, text+image, 12 languages',
	},
	{
		chute_id: 'mod2',
		name: 'llama-guard-3-8b',
		slug: 'llama-guard-3-8b',
		standard_template: 'moderation',
		public: true,
		tagline: 'LLM safety classification',
		description: 'Meta, 1B/8B/11B variants, MLCommons taxonomy',
	},
	{
		chute_id: 'mod3',
		name: 'shieldgemma-2b',
		slug: 'shieldgemma-2b',
		standard_template: 'moderation',
		public: true,
		tagline: 'High-accuracy safety',
		description: 'Google, built on Gemma2, outperforms Llama Guard by 10.8%',
	},
	{
		chute_id: 'mod4',
		name: 'granite-guardian-3b',
		slug: 'granite-guardian-3b',
		standard_template: 'moderation',
		public: true,
		tagline: 'Enterprise safety',
		description: 'IBM, enterprise-focused safety classification',
	},
	{
		chute_id: 'mod5',
		name: 'wildguard',
		slug: 'wildguard',
		standard_template: 'moderation',
		public: true,
		tagline: 'Open guardrail',
		description: 'Open guardrail for LLM safety',
	},
	{
		chute_id: 'mod6',
		name: 'nemo-guardrails',
		slug: 'nemo-guardrails',
		standard_template: 'moderation',
		public: true,
		tagline: 'Programmable safety',
		description: 'NVIDIA, programmable safety rails for LLM apps',
	},
	{
		chute_id: 'mod7',
		name: 'gpt-oss-safeguard-120b',
		slug: 'gpt-oss-safeguard-120b',
		standard_template: 'moderation',
		public: true,
		tagline: 'Safety reasoning',
		description: 'OpenAI, 20B/120B safety reasoning models',
	},
	
	// Text Toxicity/Hate Speech (with moderation template)
	{
		chute_id: 'mod8',
		name: 'detoxify-multilingual',
		slug: 'detoxify-multilingual',
		standard_template: 'moderation',
		public: true,
		tagline: 'Toxicity detection',
		description: 'RoBERTa-based, trained on Jigsaw data',
	},
	{
		chute_id: 'mod9',
		name: 'toxicbert',
		slug: 'toxicbert',
		standard_template: 'moderation',
		public: true,
		tagline: 'Toxicity classifier',
		description: 'Fine-tuned BERT for toxicity detection',
	},
	{
		chute_id: 'mod10',
		name: 'hatebert',
		slug: 'hatebert',
		standard_template: 'moderation',
		public: true,
		tagline: 'Hate speech detection',
		description: 'Specialized for hate speech detection',
	},
	{
		chute_id: 'mod11',
		name: 'perspective-toxicity',
		slug: 'perspective-toxicity',
		standard_template: 'moderation',
		public: true,
		tagline: 'Toxicity scoring',
		description: 'Google/Jigsaw, comprehensive toxicity scoring',
	},
	{
		chute_id: 'mod12',
		name: 'unitary-detoxify',
		slug: 'unitary-detoxify',
		standard_template: 'moderation',
		public: true,
		tagline: 'Multi-label toxic classifier',
		description: 'Unitary, multi-label toxic content classifier',
	},
	
	// Image/NSFW Detection (with moderation template)
	{
		chute_id: 'mod13',
		name: 'nsfw-detection-vit',
		slug: 'nsfw-detection-vit',
		standard_template: 'moderation',
		public: true,
		tagline: 'Fast NSFW detection',
		description: 'Falcons AI, fast ViT-based classifier',
	},
	{
		chute_id: 'mod14',
		name: 'nudenet',
		slug: 'nudenet',
		standard_template: 'moderation',
		public: true,
		tagline: 'Nudity detection',
		description: 'Nudity/NSFW image detection',
	},
	{
		chute_id: 'mod15',
		name: 'clip-nsfw-classifier',
		slug: 'clip-nsfw-classifier',
		standard_template: 'moderation',
		public: true,
		tagline: 'Zero-shot NSFW',
		description: 'CLIP-based zero-shot image safety classification',
	},
	{
		chute_id: 'mod16',
		name: 'stable-diffusion-safety-checker',
		slug: 'stable-diffusion-safety-checker',
		standard_template: 'moderation',
		public: true,
		tagline: 'Image generation safety',
		description: 'Stable Diffusion, image generation guardrail',
	},
	
	// Prompt Security (with moderation template)
	{
		chute_id: 'mod17',
		name: 'prompt-guard-2-86m',
		slug: 'prompt-guard-2-86m',
		standard_template: 'moderation',
		public: true,
		tagline: 'Injection detection',
		description: 'Meta, 22M/86M injection/jailbreak detection',
	},
	{
		chute_id: 'mod18',
		name: 'rebuff',
		slug: 'rebuff',
		standard_template: 'moderation',
		public: true,
		tagline: 'Prompt injection guard',
		description: 'Prompt injection detection',
	},
	{
		chute_id: 'mod19',
		name: 'llama-firewall',
		slug: 'llama-firewall',
		standard_template: 'moderation',
		public: true,
		tagline: 'Multi-guard orchestration',
		description: 'Meta, orchestrates multiple guards',
	},
	
	// Specialized (with moderation template)
	{
		chute_id: 'mod20',
		name: 'codeshield',
		slug: 'codeshield',
		standard_template: 'moderation',
		public: true,
		tagline: 'Code security detection',
		description: 'Meta, detects insecure generated code',
	},
	
	// === Models WITHOUT template (keyword-based fallback) ===
	
	{
		chute_id: 'mod21',
		name: 'custom-toxicity-filter',
		slug: 'custom-toxicity-filter',
		standard_template: null,
		public: true,
		tagline: 'Custom toxicity detection',
		description: 'Custom toxicity detection without template',
	},
	{
		chute_id: 'mod22',
		name: 'safety-classifier-bert',
		slug: 'safety-classifier-bert',
		standard_template: null,
		public: true,
		tagline: 'Safety classification',
		description: 'BERT-based safety classifier without template',
	},
	
	// === Should be EXCLUDED - Non-moderation chutes ===
	
	// LLM chute (text generation, not moderation)
	{
		chute_id: 'llm1',
		name: 'llama-3.1-8b',
		slug: 'llama-3.1-8b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Language model',
		description: 'LLM for text generation',
	},
	
	// Embedding chute
	{
		chute_id: 'emb1',
		name: 'bge-large-en',
		slug: 'bge-large-en',
		standard_template: 'tei',
		public: true,
		tagline: 'Text embeddings',
		description: 'Embedding model',
	},
	
	// Private moderation chute
	{
		chute_id: 'priv1',
		name: 'private-llama-guard',
		slug: 'private-llama-guard',
		standard_template: 'moderation',
		public: false,
		tagline: 'Private safety',
		description: 'Private moderation model',
	},
];

describe('Content Moderation Chutes - Top 20 Model Families', () => {
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

	test('should include LLM-based safety guards (Llama Guard, ShieldGemma, Granite, WildGuard, NeMo, GPT-OSS)', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://llama-guard-4-12b.chutes.ai');
		expect(slugs).toContain('https://llama-guard-3-8b.chutes.ai');
		expect(slugs).toContain('https://shieldgemma-2b.chutes.ai');
		expect(slugs).toContain('https://granite-guardian-3b.chutes.ai');
		expect(slugs).toContain('https://wildguard.chutes.ai');
		expect(slugs).toContain('https://nemo-guardrails.chutes.ai');
		expect(slugs).toContain('https://gpt-oss-safeguard-120b.chutes.ai');
	});

	test('should include text toxicity/hate speech models (Detoxify, ToxicBERT, HateBERT, Perspective, Unitary)', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://detoxify-multilingual.chutes.ai');
		expect(slugs).toContain('https://toxicbert.chutes.ai');
		expect(slugs).toContain('https://hatebert.chutes.ai');
		expect(slugs).toContain('https://perspective-toxicity.chutes.ai');
		expect(slugs).toContain('https://unitary-detoxify.chutes.ai');
	});

	test('should include image/NSFW detection models (NSFW Detection, NudeNet, CLIP, Safety Checker)', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://nsfw-detection-vit.chutes.ai');
		expect(slugs).toContain('https://nudenet.chutes.ai');
		expect(slugs).toContain('https://clip-nsfw-classifier.chutes.ai');
		expect(slugs).toContain('https://stable-diffusion-safety-checker.chutes.ai');
	});

	test('should include prompt security models (Prompt Guard, Rebuff, LlamaFirewall)', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://prompt-guard-2-86m.chutes.ai');
		expect(slugs).toContain('https://rebuff.chutes.ai');
		expect(slugs).toContain('https://llama-firewall.chutes.ai');
	});

	test('should include specialized models (CodeShield)', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://codeshield.chutes.ai');
	});

	test('should include models without template via keyword fallback', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://custom-toxicity-filter.chutes.ai');
		expect(slugs).toContain('https://safety-classifier-bert.chutes.ai');
	});

	test('should exclude LLM text generation chutes', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://llama-3.1-8b.chutes.ai');
	});

	test('should exclude embedding chutes', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://bge-large-en.chutes.ai');
	});

	test('should exclude private moderation chutes', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://private-llama-guard.chutes.ai');
	});

	test('should return all 22 public moderation chutes (20 with template + 2 keyword fallback)', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		expect(result.length).toBe(22);
	});

	test('should primarily use template-based filtering (moderation)', async () => {
		const result = await loadChutes.getModerationChutes.call(mockContext as ILoadOptionsFunctions);

		// Most should be moderation template
		const moderationCount = result.filter(c => 
			mockChutes.find(m => 
				`https://${m.slug}.chutes.ai` === c.value && 
				m.standard_template === 'moderation'
			)
		).length;

		expect(moderationCount).toBe(20); // 20 out of 22 are moderation template
	});
});

