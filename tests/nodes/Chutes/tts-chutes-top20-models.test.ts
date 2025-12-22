/**
 * Test: TTS Chutes - Top 20 Model Families
 * 
 * Verifies that text-to-speech chutes from the top 20 model families
 * are correctly included based on research-backed naming patterns.
 * 
 * Based on top 20 open source TTS models (Dec 2025):
 * - Fish Speech, Chatterbox, XTTS, Kokoro, Orpheus
 * - VibeVoice, Dia, CosyVoice, Bark, StyleTTS
 * - Tortoise, Piper, OpenAudio, F5-TTS, VITS
 * - GPT-SoVITS, MeloTTS, OpenVoice, Parler-TTS, IndexTTS
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on top 20 TTS model families
const mockChutes = [
	// === Should be INCLUDED - Top 20 TTS Model Families ===
	
	// Current leaders
	{
		chute_id: 'tts1',
		name: 'fish-speech-v1.5',
		slug: 'fish-speech-v1-5',
		standard_template: null,
		public: true,
		tagline: 'DualAR architecture',
		description: 'Top TTS Arena scores, Fish Audio',
	},
	{
		chute_id: 'tts2',
		name: 'chatterbox',
		slug: 'chatterbox',
		standard_template: null,
		public: true,
		tagline: 'Voice cloning TTS',
		description: 'Resemble AI, MIT licensed',
	},
	{
		chute_id: 'tts3',
		name: 'xtts-v2',
		slug: 'xtts-v2',
		standard_template: null,
		public: true,
		tagline: 'Zero-shot voice cloning',
		description: 'Coqui 6-second cloning, 17 languages',
	},
	{
		chute_id: 'tts4',
		name: 'kokoro-82m',
		slug: 'kokoro-82m',
		standard_template: null,
		public: true,
		tagline: 'Lightweight TTS',
		description: '82M parameters, high quality',
	},
	{
		chute_id: 'tts5',
		name: 'orpheus-tts',
		slug: 'orpheus-tts',
		standard_template: null,
		public: true,
		tagline: 'Llama-based speech',
		description: 'Expressive and low-latency',
	},
	
	// Enterprise/specialized models
	{
		chute_id: 'tts6',
		name: 'vibevoice',
		slug: 'vibevoice',
		standard_template: null,
		public: true,
		tagline: 'Long-form multi-speaker',
		description: 'Microsoft 90 min, 4 speakers',
	},
	{
		chute_id: 'tts7',
		name: 'dia-dialogue',
		slug: 'dia-dialogue',
		standard_template: null,
		public: true,
		tagline: 'Dialogue-focused',
		description: 'Nari Labs with non-verbal sounds',
	},
	{
		chute_id: 'tts8',
		name: 'cosyvoice2-0.5b',
		slug: 'cosyvoice2-0-5b',
		standard_template: null,
		public: true,
		tagline: 'Ultra-low latency',
		description: 'Alibaba 150ms streaming',
	},
	{
		chute_id: 'tts9',
		name: 'bark-suno',
		slug: 'bark-suno',
		standard_template: null,
		public: true,
		tagline: 'Multilingual with music',
		description: 'Suno sound effects generation',
	},
	
	// Quality-focused models
	{
		chute_id: 'tts10',
		name: 'styletts-2',
		slug: 'styletts-2',
		standard_template: null,
		public: true,
		tagline: 'Diffusion-based TTS',
		description: 'Human-level quality benchmarks',
	},
	{
		chute_id: 'tts11',
		name: 'tortoise-tts',
		slug: 'tortoise-tts',
		standard_template: null,
		public: true,
		tagline: 'Highest quality TTS',
		description: 'Slow but excellent prosody',
	},
	
	// Efficient/fast models
	{
		chute_id: 'tts12',
		name: 'piper-tts',
		slug: 'piper-tts',
		standard_template: null,
		public: true,
		tagline: 'Fast local TTS',
		description: 'Runs on Raspberry Pi, VITS-based',
	},
	{
		chute_id: 'tts13',
		name: 'openaudio-s1',
		slug: 'openaudio-s1',
		standard_template: null,
		public: true,
		tagline: 'Emotional control',
		description: '2M+ hours training data',
	},
	{
		chute_id: 'tts14',
		name: 'f5-tts',
		slug: 'f5-tts',
		standard_template: null,
		public: true,
		tagline: 'Flow matching TTS',
		description: 'Fast generation <30 steps',
	},
	{
		chute_id: 'tts15',
		name: 'vits-tts',
		slug: 'vits-tts',
		standard_template: null,
		public: true,
		tagline: 'VAE + adversarial',
		description: 'Foundational efficient model',
	},
	
	// Voice cloning specialists
	{
		chute_id: 'tts16',
		name: 'gpt-sovits',
		slug: 'gpt-sovits',
		standard_template: null,
		public: true,
		tagline: '5-second voice cloning',
		description: 'GPT-based voice synthesis',
	},
	{
		chute_id: 'tts17',
		name: 'melotts',
		slug: 'melotts',
		standard_template: null,
		public: true,
		tagline: 'Lightweight TTS',
		description: 'MyShell low-resource friendly',
	},
	{
		chute_id: 'tts18',
		name: 'openvoice',
		slug: 'openvoice',
		standard_template: null,
		public: true,
		tagline: 'Cross-lingual cloning',
		description: 'MyShell zero-shot voice cloning',
	},
	
	// Controllable models
	{
		chute_id: 'tts19',
		name: 'parler-tts',
		slug: 'parler-tts',
		standard_template: null,
		public: true,
		tagline: 'Controllable TTS',
		description: 'Gender, pitch, style, background control',
	},
	{
		chute_id: 'tts20',
		name: 'indextts-2',
		slug: 'indextts-2',
		standard_template: null,
		public: true,
		tagline: 'Duration precision',
		description: 'IndexTeam dubbing-focused',
	},
	
	// === Should be EXCLUDED - Non-TTS chutes ===
	
	// STT chute (opposite direction)
	{
		chute_id: 'stt1',
		name: 'whisper-large-v3',
		slug: 'whisper-large-v3',
		standard_template: null,
		public: true,
		tagline: 'Speech recognition',
		description: 'Speech to text transcription',
	},
	
	// Music generation (different audio category)
	{
		chute_id: 'music1',
		name: 'diffrhythm',
		slug: 'diffrhythm',
		standard_template: null,
		public: true,
		tagline: 'Music generation',
		description: 'AI music from lyrics',
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
	
	// Private TTS chute
	{
		chute_id: 'priv1',
		name: 'private-kokoro',
		slug: 'private-kokoro',
		standard_template: null,
		public: false,
		tagline: 'Private TTS',
		description: 'Private speech synthesis',
	},
];

describe('TTS Chutes - Top 20 Model Families', () => {
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

	test('should include top TTS models (Fish, Chatterbox, XTTS, Kokoro, Orpheus)', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://fish-speech-v1-5.chutes.ai');
		expect(slugs).toContain('https://chatterbox.chutes.ai');
		expect(slugs).toContain('https://xtts-v2.chutes.ai');
		expect(slugs).toContain('https://kokoro-82m.chutes.ai');
		expect(slugs).toContain('https://orpheus-tts.chutes.ai');
	});

	test('should include enterprise models (VibeVoice, Dia, CosyVoice, Bark)', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://vibevoice.chutes.ai');
		expect(slugs).toContain('https://dia-dialogue.chutes.ai');
		expect(slugs).toContain('https://cosyvoice2-0-5b.chutes.ai');
		expect(slugs).toContain('https://bark-suno.chutes.ai');
	});

	test('should include quality-focused models (StyleTTS, Tortoise)', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://styletts-2.chutes.ai');
		expect(slugs).toContain('https://tortoise-tts.chutes.ai');
	});

	test('should include efficient models (Piper, OpenAudio, F5, VITS)', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://piper-tts.chutes.ai');
		expect(slugs).toContain('https://openaudio-s1.chutes.ai');
		expect(slugs).toContain('https://f5-tts.chutes.ai');
		expect(slugs).toContain('https://vits-tts.chutes.ai');
	});

	test('should include voice cloning models (GPT-SoVITS, MeloTTS, OpenVoice)', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://gpt-sovits.chutes.ai');
		expect(slugs).toContain('https://melotts.chutes.ai');
		expect(slugs).toContain('https://openvoice.chutes.ai');
	});

	test('should include controllable models (Parler-TTS, IndexTTS)', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://parler-tts.chutes.ai');
		expect(slugs).toContain('https://indextts-2.chutes.ai');
	});

	test('should exclude STT chutes', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://whisper-large-v3.chutes.ai');
	});

	test('should exclude music generation chutes', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://diffrhythm.chutes.ai');
	});

	test('should exclude LLM chutes', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://qwen-qwen3-32b.chutes.ai');
	});

	test('should exclude private TTS chutes', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://private-kokoro.chutes.ai');
	});

	test('should return all 20 public TTS chutes', async () => {
		const result = await loadChutes.getTTSChutes.call(mockContext as ILoadOptionsFunctions);

		expect(result.length).toBe(20);
	});
});

