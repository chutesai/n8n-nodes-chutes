/**
 * Test: LLM Dropdown Filtering
 * 
 * Purpose: Verify that getLLMChutes() only returns text-generation capable models
 * and excludes video/image/audio/embedding/music generation chutes.
 * 
 * Problems addressed:
 * - Shows affine chutes
 * - Shows private chutes
 * - Shows non-LLM models (video, image, audio, embedding, music)
 */

import { getLLMChutes } from '../../nodes/Chutes/methods/loadChutes';
import { ILoadOptionsFunctions } from 'n8n-workflow';

describe('LLM Dropdown Filtering', () => {
	let mockContext: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		// Mock the n8n context
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			helpers: {
				request: jest.fn().mockResolvedValue({
					total: 10,
					page: 1,
					limit: 500,
					items: [
						// Valid LLM chutes
						{
							chute_id: 'llm-1',
							name: 'DeepSeek V3',
							tagline: 'Advanced language model for text generation',
							slug: 'chutes-deepseek-ai-deepseek-v3-2',
							standard_template: 'vllm',
							user: { username: 'chutes' },
							public: true,
						},
						{
							chute_id: 'llm-2',
							name: 'Llama 3.1',
							tagline: 'Meta\'s latest language model',
							slug: 'chutes-llama-3-1-70b',
							standard_template: 'vllm',
							user: { username: 'chutes' },
							public: true,
						},
						// Video chutes that should be excluded
						{
							chute_id: 'video-1',
							name: 'Wan2.2 Video Generator',
							tagline: 'Generate videos from text',
							slug: 'chutes-wan2-1-14b',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						{
							chute_id: 'video-2',
							name: 'Image to Video Fast',
							tagline: 'Convert images to video',
							slug: 'chutes-wan-2-2-i2v-14b-fast',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						// Image chutes that should be excluded
						{
							chute_id: 'image-1',
							name: 'Flux Image Generator',
							tagline: 'Generate images from text',
							slug: 'chutes-flux-1-dev',
							standard_template: 'diffusion',
							user: { username: 'chutes' },
							public: true,
						},
						{
							chute_id: 'image-2',
							name: 'SDXL Image Model',
							tagline: 'Stable Diffusion XL for image generation',
							slug: 'chutes-sdxl-turbo',
							standard_template: 'diffusion',
							user: { username: 'chutes' },
							public: true,
						},
						// Audio chutes that should be excluded
						{
							chute_id: 'audio-1',
							name: 'Kokoro TTS',
							tagline: 'Text-to-speech synthesis',
							slug: 'chutes-kokoro',
							standard_template: 'tts',
							user: { username: 'chutes' },
							public: true,
						},
						{
							chute_id: 'audio-2',
							name: 'Whisper STT',
							tagline: 'Speech-to-text transcription',
							slug: 'chutes-whisper-large-v3',
							standard_template: 'stt',
							user: { username: 'chutes' },
							public: true,
						},
						// Music chutes that should be excluded
						{
							chute_id: 'music-1',
							name: 'DiffRhythm Music Generator',
							tagline: 'Generate music from text prompts',
							slug: 'chutes-diffrhythm',
							standard_template: 'custom',
							user: { username: 'chutes' },
							public: true,
						},
						// Embedding chutes that should be excluded
						{
							chute_id: 'embed-1',
							name: 'Qwen Embeddings',
							tagline: 'Generate text embeddings for semantic search',
							slug: 'chutes-qwen-qwen3-embedding-0-6b',
							standard_template: 'tei',
							user: { username: 'chutes' },
							public: true,
						},
						// Edge case: Qwen model that's an embedding model (should be excluded)
						{
							chute_id: 'embed-2',
							name: 'Qwen3 Embedding Model',
							tagline: 'Text embedding model for semantic search',
							slug: 'chutes-qwen3-embedding',
							standard_template: 'tei',
							user: { username: 'chutes' },
							public: true,
						},
						// Private chutes that should be excluded (not public)
						{
							chute_id: 'private-1',
							name: 'My Private LLM',
							tagline: 'Private language model',
							slug: 'user-private-llm',
							standard_template: 'vllm',
							user: { username: 'someuser' },
							public: false, // NOT PUBLIC
						},
						// Affine chutes (user's chutes that should potentially be excluded)
						{
							chute_id: 'affine-1',
							name: 'Affine Custom Model',
							tagline: 'Custom affine model',
							slug: 'affine-custom-model',
							standard_template: 'vllm',
							user: { username: 'affine' },
							public: true,
						},
					],
				}),
			} as any,
		};
	});

	it('should only return public LLM chutes with vllm template', async () => {
		const result = await getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		// Should return all PUBLIC chutes with vllm template (3 in mock data: 2 @chutes + 1 @affine)
		expect(result).toHaveLength(3);

		// Verify key chutes are included
		const names = result.map(r => r.name);
		expect(names).toContain('DeepSeek V3 - Advanced language model for text generation...');
		expect(names).toContain('Llama 3.1 - Meta\'s latest language model...');
		expect(names).toContain('Affine Custom Model - Custom affine model...');
		
		// All should have vllm template
		const descriptions = result.map(r => r.description);
		descriptions.forEach(desc => {
			expect(desc).toContain('vllm');
		});
	});

	it('should exclude video generation chutes', async () => {
		const result = await getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://chutes-wan2-1-14b.chutes.ai');
		expect(slugs).not.toContain('https://chutes-wan-2-2-i2v-14b-fast.chutes.ai');
	});

	it('should exclude image generation chutes', async () => {
		const result = await getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://chutes-flux-1-dev.chutes.ai');
		expect(slugs).not.toContain('https://chutes-sdxl-turbo.chutes.ai');
	});

	it('should exclude audio chutes (TTS/STT)', async () => {
		const result = await getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://chutes-kokoro.chutes.ai');
		expect(slugs).not.toContain('https://chutes-whisper-large-v3.chutes.ai');
	});

	it('should exclude music generation chutes', async () => {
		const result = await getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://chutes-diffrhythm.chutes.ai');
	});

	it('should exclude embedding chutes', async () => {
		const result = await getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(r => r.value);
		expect(slugs).not.toContain('https://chutes-qwen-qwen3-embedding-0-6b.chutes.ai');
		expect(slugs).not.toContain('https://chutes-qwen3-embedding.chutes.ai');
	});

	it('should exclude Qwen embedding models (tei template)', async () => {
		const result = await getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		// Embedding models have tei template, not vllm
		const names = result.map(r => r.name);
		const embeddingModels = names.filter(name => name.toLowerCase().includes('embedding'));
		expect(embeddingModels).toHaveLength(0);
	});

	it('should include all public vllm chutes regardless of user/organization', async () => {
		const result = await getLLMChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(r => r.value);
		
		// These should be included (public: true, vllm template)
		expect(slugs).toContain('https://chutes-deepseek-ai-deepseek-v3-2.chutes.ai');
		expect(slugs).toContain('https://chutes-llama-3-1-70b.chutes.ai');
		expect(slugs).toContain('https://affine-custom-model.chutes.ai'); // public vllm from affine user
		
		// Private chutes should be excluded
		expect(slugs).not.toContain('https://user-private-llm.chutes.ai');
		
		// Should have 3 total (2 from @chutes + 1 from @affine)
		expect(result).toHaveLength(3);
	});
});

