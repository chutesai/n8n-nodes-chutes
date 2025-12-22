/**
 * Test: Music Generation Chutes - Top 20 Model Families
 * 
 * Verifies that music generation chutes from the top 20 model families
 * are correctly included based on research-backed naming patterns.
 * 
 * Based on top 20 open source music generation models (Dec 2025):
 * - MusicGen, YuE, ACE-Step, DiffRhythm, Stable Audio
 * - AudioLDM, Jukebox, Riffusion, AudioGen, SongGen
 * - RAVE, MuseCoco, Museformer, Magenta, MusicLM
 * - EnCodec, AudioDiffusion, Dance Diffusion, Moûsai, MusicAgent
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on top 20 music generation model families
const mockChutes = [
	// === Should be INCLUDED - Top 20 Music Model Families ===
	
	// Current leaders
	{
		chute_id: 'music1',
		name: 'musicgen-large',
		slug: 'musicgen-large',
		standard_template: null,
		public: true,
		tagline: 'Transformer-based music',
		description: 'Meta AudioCraft text & melody conditioning',
	},
	{
		chute_id: 'music2',
		name: 'yue-full-song',
		slug: 'yue-full-song',
		standard_template: null,
		public: true,
		tagline: 'Full-song with vocals',
		description: 'HKUST M-A-P lyrics-to-song',
	},
	{
		chute_id: 'music3',
		name: 'ace-step-v1',
		slug: 'ace-step-v1',
		standard_template: null,
		public: true,
		tagline: 'Stable Diffusion for music',
		description: 'ACE Studio diffusion-based, LoRA support',
	},
	{
		chute_id: 'music4',
		name: 'diffrhythm',
		slug: 'diffrhythm',
		standard_template: null,
		public: true,
		tagline: 'Fast latent diffusion',
		description: 'Generates 4:45 songs in ~10 seconds',
	},
	{
		chute_id: 'music5',
		name: 'stable-audio-open',
		slug: 'stable-audio-open',
		standard_template: null,
		public: true,
		tagline: 'High-fidelity instrumentals',
		description: 'Stability AI diffusion, T5 conditioning',
	},
	
	// Audio generation platforms
	{
		chute_id: 'music6',
		name: 'audioldm-2',
		slug: 'audioldm-2',
		standard_template: null,
		public: true,
		tagline: 'Latent diffusion audio',
		description: 'CLAP conditioning for music',
	},
	{
		chute_id: 'music7',
		name: 'jukebox-1b',
		slug: 'jukebox-1b',
		standard_template: null,
		public: true,
		tagline: 'Raw audio with vocals',
		description: 'OpenAI hierarchical VQ-VAE',
	},
	{
		chute_id: 'music8',
		name: 'riffusion-v1',
		slug: 'riffusion-v1',
		standard_template: null,
		public: true,
		tagline: 'Real-time music',
		description: 'Stable Diffusion on spectrograms',
	},
	{
		chute_id: 'music9',
		name: 'audiogen',
		slug: 'audiogen',
		standard_template: null,
		public: true,
		tagline: 'Sound effects generation',
		description: 'Meta AudioCraft text-to-audio',
	},
	{
		chute_id: 'music10',
		name: 'songgen-v2',
		slug: 'songgen-v2',
		standard_template: null,
		public: true,
		tagline: 'Vocal-instrumental harmony',
		description: 'Single-stage autoregressive',
	},
	
	// Specialized models
	{
		chute_id: 'music11',
		name: 'rave-model',
		slug: 'rave-model',
		standard_template: null,
		public: true,
		tagline: 'Real-time audio VAE',
		description: 'IRCAM manipulation & generation',
	},
	{
		chute_id: 'music12',
		name: 'musecoco',
		slug: 'musecoco',
		standard_template: null,
		public: true,
		tagline: 'Symbolic music generation',
		description: 'Microsoft symbolic AI',
	},
	{
		chute_id: 'music13',
		name: 'museformer',
		slug: 'museformer',
		standard_template: null,
		public: true,
		tagline: 'Transformer for music',
		description: 'Microsoft symbolic generation',
	},
	{
		chute_id: 'music14',
		name: 'magenta-musicvae',
		slug: 'magenta-musicvae',
		standard_template: null,
		public: true,
		tagline: 'TensorFlow music toolkit',
		description: 'Google Magenta music/art generation',
	},
	{
		chute_id: 'music15',
		name: 'musiclm-base',
		slug: 'musiclm-base',
		standard_template: null,
		public: true,
		tagline: 'Text-to-music',
		description: 'Google influential model',
	},
	
	// Foundation models & libraries
	{
		chute_id: 'music16',
		name: 'encodec-24khz',
		slug: 'encodec-24khz',
		standard_template: null,
		public: true,
		tagline: 'Neural audio codec',
		description: 'Meta foundation for many models',
	},
	{
		chute_id: 'music17',
		name: 'audiodiffusion',
		slug: 'audiodiffusion',
		standard_template: null,
		public: true,
		tagline: 'PyTorch audio diffusion',
		description: 'Audio diffusion library',
	},
	{
		chute_id: 'music18',
		name: 'dance-diffusion',
		slug: 'dance-diffusion',
		standard_template: null,
		public: true,
		tagline: 'Unconditional audio',
		description: 'Electronic music generation',
	},
	{
		chute_id: 'music19',
		name: 'mousai-efficient',
		slug: 'mousai-efficient',
		standard_template: null,
		public: true,
		tagline: 'Efficient diffusion music',
		description: 'Fast diffusion-based generation',
	},
	{
		chute_id: 'music20',
		name: 'musicagent',
		slug: 'musicagent',
		standard_template: null,
		public: true,
		tagline: 'Multi-tool agent',
		description: 'Microsoft music generation agent',
	},
	
	// === Should be EXCLUDED - Non-music chutes ===
	
	// TTS chute (different audio category)
	{
		chute_id: 'tts1',
		name: 'kokoro-82m',
		slug: 'kokoro-82m',
		standard_template: null,
		public: true,
		tagline: 'Text-to-speech',
		description: 'Lightweight TTS model',
	},
	
	// STT chute (different audio category)
	{
		chute_id: 'stt1',
		name: 'whisper-large-v3',
		slug: 'whisper-large-v3',
		standard_template: null,
		public: true,
		tagline: 'Speech recognition',
		description: 'Speech to text transcription',
	},
	
	// LLM chute
	{
		chute_id: 'llm1',
		name: 'Qwen/Qwen3-32B',
		slug: 'qwen-qwen3-32b',
		standard_template: 'vllm',
		public: true,
		tagline: 'Language model',
		description: 'LLM for text generation',
	},
	
	// Private music chute
	{
		chute_id: 'priv1',
		name: 'private-musicgen',
		slug: 'private-musicgen',
		standard_template: null,
		public: false,
		tagline: 'Private music gen',
		description: 'Private music generation',
	},
];

describe('Music Generation Chutes - Top 20 Model Families', () => {
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

	test('should include current leaders (MusicGen, YuE, ACE-Step, DiffRhythm, Stable Audio)', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://musicgen-large.chutes.ai');
		expect(slugs).toContain('https://yue-full-song.chutes.ai');
		expect(slugs).toContain('https://ace-step-v1.chutes.ai');
		expect(slugs).toContain('https://diffrhythm.chutes.ai');
		expect(slugs).toContain('https://stable-audio-open.chutes.ai');
	});

	test('should include audio generation platforms (AudioLDM, Jukebox, Riffusion, AudioGen, SongGen)', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://audioldm-2.chutes.ai');
		expect(slugs).toContain('https://jukebox-1b.chutes.ai');
		expect(slugs).toContain('https://riffusion-v1.chutes.ai');
		expect(slugs).toContain('https://audiogen.chutes.ai');
		expect(slugs).toContain('https://songgen-v2.chutes.ai');
	});

	test('should include specialized models (RAVE, MuseCoco, Museformer, Magenta, MusicLM)', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://rave-model.chutes.ai');
		expect(slugs).toContain('https://musecoco.chutes.ai');
		expect(slugs).toContain('https://museformer.chutes.ai');
		expect(slugs).toContain('https://magenta-musicvae.chutes.ai');
		expect(slugs).toContain('https://musiclm-base.chutes.ai');
	});

	test('should include foundation models (EnCodec, AudioDiffusion, Dance, Moûsai, MusicAgent)', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://encodec-24khz.chutes.ai');
		expect(slugs).toContain('https://audiodiffusion.chutes.ai');
		expect(slugs).toContain('https://dance-diffusion.chutes.ai');
		expect(slugs).toContain('https://mousai-efficient.chutes.ai');
		expect(slugs).toContain('https://musicagent.chutes.ai');
	});

	test('should exclude TTS chutes', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://kokoro-82m.chutes.ai');
	});

	test('should exclude STT chutes', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://whisper-large-v3.chutes.ai');
	});

	test('should exclude LLM chutes', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://qwen-qwen3-32b.chutes.ai');
	});

	test('should exclude private music chutes', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://private-musicgen.chutes.ai');
	});

	test('should return all 20 public music chutes', async () => {
		const result = await loadChutes.getMusicChutes.call(mockContext as ILoadOptionsFunctions);

		expect(result.length).toBe(20);
	});
});

