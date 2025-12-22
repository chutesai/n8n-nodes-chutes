/**
 * Test: Embedding Chutes - Top 20 Model Families
 * 
 * Verifies that embedding chutes from the top 20 model families
 * are correctly included based on research-backed naming patterns.
 * 
 * Based on top 20 open source embedding models (Dec 2025):
 * - Qwen3-Embedding, BGE/BGE-M3, E5, Nomic Embed, GTE
 * - Jina Embeddings, mxbai-embed, all-MiniLM, all-mpnet, Instructor
 * - UAE, SFR-Embedding, Stella, EmbeddingGemma, Snowflake Arctic
 * - NV-Embed, GIST, Contriever, ColBERT, DRAGON
 * 
 * Note: Embeddings primarily use template-based filtering (`tei`),
 * but keyword fallbacks ensure comprehensive coverage.
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on top 20 embedding model families
const mockChutes = [
	// === Should be INCLUDED - Top 20 Embedding Model Families ===
	
	// Current leaders (with TEI template)
	{
		chute_id: 'emb1',
		name: 'qwen3-embedding-8b',
		slug: 'qwen3-embedding-8b',
		standard_template: 'tei',
		public: true,
		tagline: 'Multilingual embeddings',
		description: 'Alibaba, 0.6B-8B variants, instruction-aware',
	},
	{
		chute_id: 'emb2',
		name: 'bge-m3',
		slug: 'bge-m3',
		standard_template: 'tei',
		public: true,
		tagline: 'Multilingual embeddings',
		description: 'BAAI, excellent for multilingual/Chinese',
	},
	{
		chute_id: 'emb3',
		name: 'e5-mistral-7b-instruct',
		slug: 'e5-mistral-7b-instruct',
		standard_template: 'tei',
		public: true,
		tagline: 'High-performance embeddings',
		description: 'Microsoft, E5-base/large/mistral variants',
	},
	{
		chute_id: 'emb4',
		name: 'nomic-embed-text-v2',
		slug: 'nomic-embed-text-v2',
		standard_template: 'tei',
		public: true,
		tagline: 'MoE embeddings',
		description: 'Nomic AI, first MoE embedding model, 8K context',
	},
	{
		chute_id: 'emb5',
		name: 'gte-large',
		slug: 'gte-large',
		standard_template: 'tei',
		public: true,
		tagline: 'General text embeddings',
		description: 'Alibaba, strong MTEB scores',
	},
	
	// High-performers (with TEI template)
	{
		chute_id: 'emb6',
		name: 'jina-embeddings-v3',
		slug: 'jina-embeddings-v3',
		standard_template: 'tei',
		public: true,
		tagline: 'Task-specific embeddings',
		description: 'Jina AI, 8K context, adapters',
	},
	{
		chute_id: 'emb7',
		name: 'mxbai-embed-large',
		slug: 'mxbai-embed-large',
		standard_template: 'tei',
		public: true,
		tagline: 'High-quality embeddings',
		description: 'Mixedbread AI, beats OpenAI text-embedding-3-large',
	},
	{
		chute_id: 'emb8',
		name: 'all-minilm-l6-v2',
		slug: 'all-minilm-l6-v2',
		standard_template: 'tei',
		public: true,
		tagline: 'Lightweight classic',
		description: 'Sentence Transformers, 200M+ downloads',
	},
	{
		chute_id: 'emb9',
		name: 'all-mpnet-base-v2',
		slug: 'all-mpnet-base-v2',
		standard_template: 'tei',
		public: true,
		tagline: 'Balanced embeddings',
		description: 'Sentence Transformers, higher quality than MiniLM',
	},
	{
		chute_id: 'emb10',
		name: 'instructor-large',
		slug: 'instructor-large',
		standard_template: 'tei',
		public: true,
		tagline: 'Instruction-tuned',
		description: 'HKUNLP, task-specific embeddings',
	},
	
	// Specialized models (with TEI template)
	{
		chute_id: 'emb11',
		name: 'uae-large-v1',
		slug: 'uae-large-v1',
		standard_template: 'tei',
		public: true,
		tagline: 'Universal AnglE Embedding',
		description: 'WhereIsAI, angle-based optimization',
	},
	{
		chute_id: 'emb12',
		name: 'sfr-embedding-mistral',
		slug: 'sfr-embedding-mistral',
		standard_template: 'tei',
		public: true,
		tagline: 'Strong retrieval',
		description: 'Salesforce, high performance',
	},
	{
		chute_id: 'emb13',
		name: 'stella-en-1.5b-v5',
		slug: 'stella-en-1.5b-v5',
		standard_template: 'tei',
		public: true,
		tagline: 'Compact high-performer',
		description: 'Efficient embeddings',
	},
	{
		chute_id: 'emb14',
		name: 'embeddinggemma-7b',
		slug: 'embeddinggemma-7b',
		standard_template: 'tei',
		public: true,
		tagline: 'Matryoshka learning',
		description: 'Google, 100+ languages',
	},
	{
		chute_id: 'emb15',
		name: 'snowflake-arctic-embed-large',
		slug: 'snowflake-arctic-embed-large',
		standard_template: 'tei',
		public: true,
		tagline: 'Multiple sizes',
		description: 'Snowflake, strong retrieval',
	},
	
	// Enterprise & research (with TEI template)
	{
		chute_id: 'emb16',
		name: 'nv-embed-v1',
		slug: 'nv-embed-v1',
		standard_template: 'tei',
		public: true,
		tagline: 'Enterprise embeddings',
		description: 'NVIDIA, high-performance',
	},
	{
		chute_id: 'emb17',
		name: 'gist-embedding-v0',
		slug: 'gist-embedding-v0',
		standard_template: 'tei',
		public: true,
		tagline: 'Guided embeddings',
		description: 'Guided In-context Self-Training',
	},
	{
		chute_id: 'emb18',
		name: 'contriever-msmarco',
		slug: 'contriever-msmarco',
		standard_template: 'tei',
		public: true,
		tagline: 'Unsupervised retrieval',
		description: 'Meta, dense retrieval',
	},
	{
		chute_id: 'emb19',
		name: 'colbertv2',
		slug: 'colbertv2',
		standard_template: 'tei',
		public: true,
		tagline: 'Late interaction',
		description: 'Token-level matching',
	},
	{
		chute_id: 'emb20',
		name: 'dragon-plus',
		slug: 'dragon-plus',
		standard_template: 'tei',
		public: true,
		tagline: 'Dense retrieval',
		description: 'Meta, diverse augmentation',
	},
	
	// === Models WITHOUT template (keyword-based fallback) ===
	
	{
		chute_id: 'emb21',
		name: 'custom-qwen-embed',
		slug: 'custom-qwen-embed',
		standard_template: null,
		public: true,
		tagline: 'Custom embeddings',
		description: 'Qwen-based embedding model without template',
	},
	{
		chute_id: 'emb22',
		name: 'sentence-transformers-paraphrase',
		slug: 'sentence-transformers-paraphrase',
		standard_template: null,
		public: true,
		tagline: 'Paraphrase embeddings',
		description: 'Sentence transformer for embeddings',
	},
	
	// === Should be EXCLUDED - Non-embedding chutes ===
	
	// LLM chute with misleading name
	{
		chute_id: 'llm1',
		name: 'qwen3-32b',
		slug: 'qwen3-32b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Language model',
		description: 'LLM for text generation',
	},
	
	// Image chute
	{
		chute_id: 'img1',
		name: 'stable-diffusion-xl',
		slug: 'stable-diffusion-xl',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Image generation',
		description: 'Diffusion model for images',
	},
	
	// Private embedding chute
	{
		chute_id: 'priv1',
		name: 'private-bge-large',
		slug: 'private-bge-large',
		standard_template: 'tei',
		public: false,
		tagline: 'Private embeddings',
		description: 'Private embedding model',
	},
];

describe('Embedding Chutes - Top 20 Model Families', () => {
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

	test('should include current leaders with TEI template (Qwen3, BGE, E5, Nomic, GTE)', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://qwen3-embedding-8b.chutes.ai');
		expect(slugs).toContain('https://bge-m3.chutes.ai');
		expect(slugs).toContain('https://e5-mistral-7b-instruct.chutes.ai');
		expect(slugs).toContain('https://nomic-embed-text-v2.chutes.ai');
		expect(slugs).toContain('https://gte-large.chutes.ai');
	});

	test('should include high-performers (Jina, mxbai, MiniLM, mpnet, Instructor)', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://jina-embeddings-v3.chutes.ai');
		expect(slugs).toContain('https://mxbai-embed-large.chutes.ai');
		expect(slugs).toContain('https://all-minilm-l6-v2.chutes.ai');
		expect(slugs).toContain('https://all-mpnet-base-v2.chutes.ai');
		expect(slugs).toContain('https://instructor-large.chutes.ai');
	});

	test('should include specialized models (UAE, SFR, Stella, EmbeddingGemma, Arctic)', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://uae-large-v1.chutes.ai');
		expect(slugs).toContain('https://sfr-embedding-mistral.chutes.ai');
		expect(slugs).toContain('https://stella-en-1.5b-v5.chutes.ai');
		expect(slugs).toContain('https://embeddinggemma-7b.chutes.ai');
		expect(slugs).toContain('https://snowflake-arctic-embed-large.chutes.ai');
	});

	test('should include enterprise & research (NV-Embed, GIST, Contriever, ColBERT, DRAGON)', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://nv-embed-v1.chutes.ai');
		expect(slugs).toContain('https://gist-embedding-v0.chutes.ai');
		expect(slugs).toContain('https://contriever-msmarco.chutes.ai');
		expect(slugs).toContain('https://colbertv2.chutes.ai');
		expect(slugs).toContain('https://dragon-plus.chutes.ai');
	});

	test('should include models without template via keyword fallback', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://custom-qwen-embed.chutes.ai');
		expect(slugs).toContain('https://sentence-transformers-paraphrase.chutes.ai');
	});

	test('should exclude LLM chutes', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://qwen3-32b.chutes.ai');
	});

	test('should exclude image chutes', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://stable-diffusion-xl.chutes.ai');
	});

	test('should exclude private embedding chutes', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://private-bge-large.chutes.ai');
	});

	test('should return all 22 public embedding chutes (20 with template + 2 keyword fallback)', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		expect(result.length).toBe(22);
	});

	test('should primarily use template-based filtering (tei)', async () => {
		const result = await loadChutes.getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);

		// Most should be TEI template
		const teiCount = result.filter(c => 
			mockChutes.find(m => 
				`https://${m.slug}.chutes.ai` === c.value && 
				m.standard_template === 'tei'
			)
		).length;

		expect(teiCount).toBe(20); // 20 out of 22 are TEI template
	});
});

