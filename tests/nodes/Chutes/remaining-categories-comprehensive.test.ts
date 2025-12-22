/**
 * Test: Remaining Categories - Comprehensive Real-World Filtering
 * 
 * Verifies filtering logic for all remaining chute categories:
 * - Content Moderation
 * - Embeddings
 * - Music Generation
 * - Speech to Text (STT)
 * - Text to Speech (TTS)
 * - Video Generation
 * 
 * Based on REAL chutes from user screenshots (Dec 2025).
 * 
 * Strategy: Use template-based filtering where available (embeddings, moderation),
 * and keyword-based filtering with future-proofing for categories without templates.
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on REAL chutes from Chutes.ai (from user screenshots)
const mockChutes = [
	// === CONTENT MODERATION ===
	{
		chute_id: 'mod1',
		name: 'nsfw-classifier',
		slug: 'nsfw-classifier',
		standard_template: 'moderation', // API has moderation template
		public: true,
		tagline: 'NSFW content detection',
		description: 'Content moderation for NSFW images',
	},
	{
		chute_id: 'mod2',
		name: 'hate-speech-detector',
		slug: 'hate-speech-detector',
		standard_template: 'moderation',
		public: true,
		tagline: 'Hate speech detection',
		description: 'Content moderation for text',
	},
	// Future moderation chute without template
	{
		chute_id: 'mod3',
		name: 'toxicity-filter',
		slug: 'toxicity-filter',
		standard_template: null,
		public: true,
		tagline: 'Toxicity detection',
		description: 'Moderation service for toxic content',
	},
	
	// === EMBEDDINGS ===
	{
		chute_id: 'emb1',
		name: 'Qwen/Qwen3-Embedding-8B',
		slug: 'qwen-qwen3-embedding-8b',
		standard_template: 'embedding', // API has embedding template
		public: true,
		tagline: 'Qwen3-Embedding-8B',
		description: 'Text embeddings',
	},
	{
		chute_id: 'emb2',
		name: 'Qwen/Qwen3-Embedding-0.6B',
		slug: 'qwen-qwen3-embedding-0-6b',
		standard_template: 'embedding',
		public: true,
		tagline: 'Qwen3-Embedding-0.6B',
		description: 'Text embeddings',
	},
	{
		chute_id: 'emb3',
		name: 'BAAI/bge-large-en-v1.5',
		slug: 'baai-bge-large-en-v1-5',
		standard_template: 'tei', // TEI template
		public: true,
		tagline: 'BGE embeddings',
		description: 'Text embeddings inference',
	},
	// Future embedding without template
	{
		chute_id: 'emb4',
		name: 'custom-embed-model',
		slug: 'custom-embed-model',
		standard_template: null,
		public: true,
		tagline: 'Custom embeddings',
		description: 'Text embedding service for semantic search',
	},
	
	// === MUSIC GENERATION ===
	{
		chute_id: 'music1',
		name: 'diffrhythm',
		slug: 'diffrhythm',
		standard_template: null, // No template yet
		public: true,
		tagline: 'AI music generation',
		description: 'Generate music from text and lyrics',
	},
	// Future music chute
	{
		chute_id: 'music2',
		name: 'musicgen-large',
		slug: 'musicgen-large',
		standard_template: null,
		public: true,
		tagline: 'Music creation AI',
		description: 'AI-powered song generation',
	},
	
	// === SPEECH TO TEXT (STT) ===
	{
		chute_id: 'stt1',
		name: 'whisper-large-v3',
		slug: 'whisper-large-v3',
		standard_template: null, // No template yet
		public: true,
		tagline: 'Speech recognition',
		description: 'Speech to text transcription',
	},
	// Future STT chute
	{
		chute_id: 'stt2',
		name: 'seamlessm4t',
		slug: 'seamlessm4t',
		standard_template: null,
		public: true,
		tagline: 'Multilingual ASR',
		description: 'Automatic speech recognition service',
	},
	
	// === TEXT TO SPEECH (TTS) ===
	{
		chute_id: 'tts1',
		name: 'kokoro',
		slug: 'kokoro',
		standard_template: null, // No template yet
		public: true,
		tagline: 'Natural TTS',
		description: 'Text to speech synthesis',
	},
	{
		chute_id: 'tts2',
		name: 'csm-1b',
		slug: 'csm-1b',
		standard_template: null,
		public: true,
		tagline: 'Conversational speech',
		description: 'Text to speech model',
	},
	// Future TTS chute
	{
		chute_id: 'tts3',
		name: 'bark-tts',
		slug: 'bark-tts',
		standard_template: null,
		public: true,
		tagline: 'Audio generation',
		description: 'TTS with voice cloning',
	},
	
	// === VIDEO GENERATION ===
	// Current chutes
	{
		chute_id: 'video1',
		name: 'Wan-2.2-I2V-14B-Fast',
		slug: 'wan-2-2-i2v-14b-fast',
		standard_template: null, // No template yet
		public: true,
		tagline: 'Image to video',
		description: 'Video generation from images',
	},
	{
		chute_id: 'video2',
		name: 'wan2.1-14b',
		slug: 'wan2-1-14b',
		standard_template: null,
		public: true,
		tagline: 'Video AI',
		description: 'Generate videos from prompts',
	},
	// Future video chutes - based on top 20 models research
	{
		chute_id: 'video3',
		name: 'cogvideox-5b',
		slug: 'cogvideox-5b',
		standard_template: null,
		public: true,
		tagline: 'Text to video',
		description: 'CogVideoX 5B parameter model',
	},
	{
		chute_id: 'video4',
		name: 'hunyuan-video-13b',
		slug: 'hunyuan-video-13b',
		standard_template: null,
		public: true,
		tagline: 'Cinematic quality',
		description: 'Tencent HunyuanVideo model',
	},
	{
		chute_id: 'video5',
		name: 'mochi-10b',
		slug: 'mochi-10b',
		standard_template: null,
		public: true,
		tagline: 'Strong motion fidelity',
		description: 'Genmo Mochi video model',
	},
	{
		chute_id: 'video6',
		name: 'ltx-video',
		slug: 'ltx-video',
		standard_template: null,
		public: true,
		tagline: 'Fast inference',
		description: 'Lightricks LTX-Video for consumer GPUs',
	},
	{
		chute_id: 'video7',
		name: 'stable-video-diffusion',
		slug: 'stable-video-diffusion',
		standard_template: null,
		public: true,
		tagline: 'Image to video pioneer',
		description: 'Stability AI SVD model',
	},
	{
		chute_id: 'video8',
		name: 'animatediff',
		slug: 'animatediff',
		standard_template: null,
		public: true,
		tagline: 'Add motion to images',
		description: 'AnimateDiff adds motion to Stable Diffusion',
	},
	{
		chute_id: 'video9',
		name: 'open-sora-plan',
		slug: 'open-sora-plan',
		standard_template: null,
		public: true,
		tagline: 'Open Sora replication',
		description: 'PKU-Yuan Lab Sora implementation',
	},
	{
		chute_id: 'video10',
		name: 'modelscope-t2v',
		slug: 'modelscope-t2v',
		standard_template: null,
		public: true,
		tagline: 'Alibaba baseline',
		description: 'ModelScope text-to-video baseline',
	},
	// REGRESSION TEST: Video chute with diffusion template (like Stable Video Diffusion)
	{
		chute_id: 'video11',
		name: 'stable-video-diffusion-xt',
		slug: 'stable-video-diffusion-xt',
		standard_template: 'diffusion', // ✅ Real SVD chutes have diffusion template!
		public: true,
		tagline: 'Image to video',
		description: 'Stability AI video generation from images',
	},
	
	// === EXCLUSIONS - Should NOT appear in any of the above ===
	{
		chute_id: 'llm1',
		name: 'Qwen/Qwen3-32B',
		slug: 'qwen-qwen3-32b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Language model',
		description: 'LLM for text generation',
	},
	{
		chute_id: 'img1',
		name: 'flux-1-dev',
		slug: 'flux-1-dev',
		standard_template: 'diffusion',
		public: true,
		tagline: 'Image generation',
		description: 'Diffusion model for images',
	},
	// Private chutes
	{
		chute_id: 'priv1',
		name: 'private-moderation',
		slug: 'private-moderation',
		standard_template: 'moderation',
		public: false,
		tagline: 'Private moderation',
		description: 'Private content filter',
	},
];

describe('Content Moderation Chutes', () => {
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

	test('should include template-based moderation chutes', async () => {
		// This will call getModerationChutes or similar
		// For now, let's assume we need to check if it exists
		const hasMethod = typeof (loadChutes as any).getModerationChutes === 'function';
		
		if (!hasMethod) {
			// Method doesn't exist yet - test should fail
			throw new Error('getModerationChutes method does not exist');
		}
		
		const result = await (loadChutes as any).getModerationChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).toContain('https://nsfw-classifier.chutes.ai');
		expect(slugs).toContain('https://hate-speech-detector.chutes.ai');
	});

	test('should include keyword-based moderation chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getModerationChutes === 'function';
		if (!hasMethod) throw new Error('getModerationChutes method does not exist');
		
		const result = await (loadChutes as any).getModerationChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).toContain('https://toxicity-filter.chutes.ai');
	});

	test('should exclude non-moderation chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getModerationChutes === 'function';
		if (!hasMethod) throw new Error('getModerationChutes method does not exist');
		
		const result = await (loadChutes as any).getModerationChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).not.toContain('https://qwen-qwen3-32b.chutes.ai');
		expect(slugs).not.toContain('https://flux-1-dev.chutes.ai');
	});

	test('should exclude private moderation chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getModerationChutes === 'function';
		if (!hasMethod) throw new Error('getModerationChutes method does not exist');
		
		const result = await (loadChutes as any).getModerationChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).not.toContain('https://private-moderation.chutes.ai');
	});
});

describe('Embeddings Chutes', () => {
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

	test('should include embedding template chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getEmbeddingChutes === 'function';
		if (!hasMethod) throw new Error('getEmbeddingChutes method does not exist');
		
		const result = await (loadChutes as any).getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).toContain('https://qwen-qwen3-embedding-8b.chutes.ai');
		expect(slugs).toContain('https://qwen-qwen3-embedding-0-6b.chutes.ai');
	});

	test('should include TEI template chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getEmbeddingChutes === 'function';
		if (!hasMethod) throw new Error('getEmbeddingChutes method does not exist');
		
		const result = await (loadChutes as any).getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).toContain('https://baai-bge-large-en-v1-5.chutes.ai');
	});

	test('should include keyword-based embedding chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getEmbeddingChutes === 'function';
		if (!hasMethod) throw new Error('getEmbeddingChutes method does not exist');
		
		const result = await (loadChutes as any).getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).toContain('https://custom-embed-model.chutes.ai');
	});

	test('should exclude LLM chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getEmbeddingChutes === 'function';
		if (!hasMethod) throw new Error('getEmbeddingChutes method does not exist');
		
		const result = await (loadChutes as any).getEmbeddingChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).not.toContain('https://qwen-qwen3-32b.chutes.ai');
	});
});

describe('Music Generation Chutes', () => {
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

	test('should include music generation chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getMusicChutes === 'function';
		if (!hasMethod) throw new Error('getMusicChutes method does not exist');
		
		const result = await (loadChutes as any).getMusicChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).toContain('https://diffrhythm.chutes.ai');
		expect(slugs).toContain('https://musicgen-large.chutes.ai');
	});

	test('should exclude TTS/STT chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getMusicChutes === 'function';
		if (!hasMethod) throw new Error('getMusicChutes method does not exist');
		
		const result = await (loadChutes as any).getMusicChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).not.toContain('https://whisper-large-v3.chutes.ai');
		expect(slugs).not.toContain('https://kokoro.chutes.ai');
	});
});

describe('Speech to Text (STT) Chutes', () => {
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

	test('should include STT chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getSTTChutes === 'function';
		if (!hasMethod) throw new Error('getSTTChutes method does not exist');
		
		const result = await (loadChutes as any).getSTTChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).toContain('https://whisper-large-v3.chutes.ai');
		expect(slugs).toContain('https://seamlessm4t.chutes.ai');
	});

	test('should exclude TTS chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getSTTChutes === 'function';
		if (!hasMethod) throw new Error('getSTTChutes method does not exist');
		
		const result = await (loadChutes as any).getSTTChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).not.toContain('https://kokoro.chutes.ai');
	});
});

describe('Text to Speech (TTS) Chutes', () => {
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

	test('should include TTS chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getTTSChutes === 'function';
		if (!hasMethod) throw new Error('getTTSChutes method does not exist');
		
		const result = await (loadChutes as any).getTTSChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).toContain('https://kokoro.chutes.ai');
		expect(slugs).toContain('https://csm-1b.chutes.ai');
		expect(slugs).toContain('https://bark-tts.chutes.ai');
	});

	test('should exclude STT chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getTTSChutes === 'function';
		if (!hasMethod) throw new Error('getTTSChutes method does not exist');
		
		const result = await (loadChutes as any).getTTSChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).not.toContain('https://whisper-large-v3.chutes.ai');
	});
});

describe('Video Generation Chutes', () => {
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

	test('should include video generation chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getVideoChutes === 'function';
		if (!hasMethod) throw new Error('getVideoChutes method does not exist');
		
		const result = await (loadChutes as any).getVideoChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		
		// Current chutes
		expect(slugs).toContain('https://wan-2-2-i2v-14b-fast.chutes.ai');
		expect(slugs).toContain('https://wan2-1-14b.chutes.ai');
		
		// Future chutes - top 20 video model families
		expect(slugs).toContain('https://cogvideox-5b.chutes.ai');
		expect(slugs).toContain('https://hunyuan-video-13b.chutes.ai');
		expect(slugs).toContain('https://mochi-10b.chutes.ai');
		expect(slugs).toContain('https://ltx-video.chutes.ai');
		expect(slugs).toContain('https://stable-video-diffusion.chutes.ai');
		expect(slugs).toContain('https://animatediff.chutes.ai');
		expect(slugs).toContain('https://open-sora-plan.chutes.ai');
		expect(slugs).toContain('https://modelscope-t2v.chutes.ai');
		
		// REGRESSION TEST: Video chutes with diffusion template should be included
		expect(slugs).toContain('https://stable-video-diffusion-xt.chutes.ai');
		
		// Should return all 11 video chutes (10 + 1 diffusion-based)
		expect(result.length).toBe(11);
	});

	test('should exclude image generation chutes', async () => {
		const hasMethod = typeof (loadChutes as any).getVideoChutes === 'function';
		if (!hasMethod) throw new Error('getVideoChutes method does not exist');
		
		const result = await (loadChutes as any).getVideoChutes.call(mockContext as ILoadOptionsFunctions);
		
		const slugs = result.map((c: any) => c.value);
		expect(slugs).not.toContain('https://flux-1-dev.chutes.ai');
	});
});

