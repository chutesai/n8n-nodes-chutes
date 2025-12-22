/**
 * Test: Speech-to-Text (STT/ASR) Chutes - Top 20 Model Families
 * 
 * Verifies that STT chutes from the top 20 model families
 * are correctly included based on research-backed naming patterns.
 * 
 * Based on top 20 open source STT/ASR models (Dec 2025):
 * - Whisper variants, Voxtral, Canary Qwen, Granite Speech, Parakeet
 * - Wav2Vec, NeMo, SpeechBrain, Vosk, Kaldi
 * - faster-whisper, whisper.cpp, Distil-Whisper, Conformer, HuBERT
 * - SeamlessM4T, MMS, Moonshine, Julius
 */

import { ILoadOptionsFunctions } from 'n8n-workflow';
import * as loadChutes from '../../../nodes/Chutes/methods/loadChutes';

// Mock data based on top 20 STT/ASR model families
const mockChutes = [
	// === Should be INCLUDED - Top 20 STT Model Families ===
	
	// Whisper variants (gold standard)
	{
		chute_id: 'stt1',
		name: 'whisper-large-v3',
		slug: 'whisper-large-v3',
		standard_template: null,
		public: true,
		tagline: 'Speech recognition',
		description: 'OpenAI Whisper, ~100 languages, 680k hours training',
	},
	{
		chute_id: 'stt2',
		name: 'whisper-large-v3-turbo',
		slug: 'whisper-large-v3-turbo',
		standard_template: null,
		public: true,
		tagline: 'Fast speech-to-text',
		description: 'Latest faster iteration of Whisper',
	},
	{
		chute_id: 'stt3',
		name: 'faster-whisper-large',
		slug: 'faster-whisper-large',
		standard_template: null,
		public: true,
		tagline: 'Optimized Whisper',
		description: 'CTranslate2 optimized, 4x faster',
	},
	{
		chute_id: 'stt4',
		name: 'whisper-cpp',
		slug: 'whisper-cpp',
		standard_template: null,
		public: true,
		tagline: 'C++ Whisper port',
		description: 'Edge/CPU deployment',
	},
	{
		chute_id: 'stt5',
		name: 'distil-whisper-large',
		slug: 'distil-whisper-large',
		standard_template: null,
		public: true,
		tagline: 'Distilled Whisper',
		description: '6x faster with minimal accuracy loss',
	},
	
	// Current leaders
	{
		chute_id: 'stt6',
		name: 'voxtral-24b',
		slug: 'voxtral-24b',
		standard_template: null,
		public: true,
		tagline: 'SOTA ASR',
		description: 'Mistral, beats Whisper on benchmarks',
	},
	{
		chute_id: 'stt7',
		name: 'canary-qwen-2.5b',
		slug: 'canary-qwen-2.5b',
		standard_template: null,
		public: true,
		tagline: '#1 on Open ASR Leaderboard',
		description: 'NVIDIA, 5.63% WER, hybrid ASR+LLM',
	},
	{
		chute_id: 'stt8',
		name: 'granite-speech-3.3-8b',
		slug: 'granite-speech-3.3-8b',
		standard_template: null,
		public: true,
		tagline: '#2 on leaderboard',
		description: 'IBM, enterprise-focused, translation',
	},
	{
		chute_id: 'stt9',
		name: 'parakeet-tdt-0.6b',
		slug: 'parakeet-tdt-0.6b',
		standard_template: null,
		public: true,
		tagline: 'Blazing fast ASR',
		description: 'NVIDIA, RTFx 3386',
	},
	
	// Foundational models
	{
		chute_id: 'stt10',
		name: 'wav2vec2-large',
		slug: 'wav2vec2-large',
		standard_template: null,
		public: true,
		tagline: 'Self-supervised ASR',
		description: 'Meta, great for fine-tuning',
	},
	{
		chute_id: 'stt11',
		name: 'nemo-asr-conformer',
		slug: 'nemo-asr-conformer',
		standard_template: null,
		public: true,
		tagline: 'Full ASR toolkit',
		description: 'NVIDIA, Conformer/Transducer',
	},
	{
		chute_id: 'stt12',
		name: 'speechbrain-asr',
		slug: 'speechbrain-asr',
		standard_template: null,
		public: true,
		tagline: 'End-to-end toolkit',
		description: 'Academic favorite',
	},
	{
		chute_id: 'stt13',
		name: 'vosk-model-en',
		slug: 'vosk-model-en',
		standard_template: null,
		public: true,
		tagline: 'Lightweight offline ASR',
		description: 'Alpha Cephei, 20+ languages, <100MB',
	},
	{
		chute_id: 'stt14',
		name: 'kaldi-asr',
		slug: 'kaldi-asr',
		standard_template: null,
		public: true,
		tagline: 'Classic ASR pipeline',
		description: 'Still used in research',
	},
	
	// Advanced architectures
	{
		chute_id: 'stt15',
		name: 'conformer-transducer',
		slug: 'conformer-transducer',
		standard_template: null,
		public: true,
		tagline: 'Hybrid architecture',
		description: 'Google, Convolution + Transformer',
	},
	{
		chute_id: 'stt16',
		name: 'hubert-large',
		slug: 'hubert-large',
		standard_template: null,
		public: true,
		tagline: 'Self-supervised speech',
		description: 'Meta, speech representation',
	},
	{
		chute_id: 'stt17',
		name: 'seamlessm4t-large',
		slug: 'seamlessm4t-large',
		standard_template: null,
		public: true,
		tagline: 'Multilingual translation',
		description: 'Meta, speech translation',
	},
	{
		chute_id: 'stt18',
		name: 'mms-1b-all',
		slug: 'mms-1b-all',
		standard_template: null,
		public: true,
		tagline: 'Massively multilingual',
		description: 'Meta, 1000+ languages',
	},
	{
		chute_id: 'stt19',
		name: 'moonshine-base',
		slug: 'moonshine-base',
		standard_template: null,
		public: true,
		tagline: 'Efficient on-device',
		description: 'On-device ASR',
	},
	{
		chute_id: 'stt20',
		name: 'julius-asr',
		slug: 'julius-asr',
		standard_template: null,
		public: true,
		tagline: 'Lightweight multilingual',
		description: 'Originally Japanese, now multilingual',
	},
	
	// === Should be EXCLUDED - Non-STT chutes ===
	
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
	
	// Music chute (different audio category)
	{
		chute_id: 'music1',
		name: 'diffrhythm',
		slug: 'diffrhythm',
		standard_template: null,
		public: true,
		tagline: 'Music generation',
		description: 'Fast latent diffusion music',
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
	
	// Private STT chute
	{
		chute_id: 'priv1',
		name: 'private-whisper',
		slug: 'private-whisper',
		standard_template: null,
		public: false,
		tagline: 'Private speech recognition',
		description: 'Private STT model',
	},
];

describe('Speech-to-Text (STT/ASR) Chutes - Top 20 Model Families', () => {
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

	test('should include Whisper variants (Whisper, Large V3 Turbo, faster, cpp, Distil)', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://whisper-large-v3.chutes.ai');
		expect(slugs).toContain('https://whisper-large-v3-turbo.chutes.ai');
		expect(slugs).toContain('https://faster-whisper-large.chutes.ai');
		expect(slugs).toContain('https://whisper-cpp.chutes.ai');
		expect(slugs).toContain('https://distil-whisper-large.chutes.ai');
	});

	test('should include current leaders (Voxtral, Canary Qwen, Granite Speech, Parakeet)', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://voxtral-24b.chutes.ai');
		expect(slugs).toContain('https://canary-qwen-2.5b.chutes.ai');
		expect(slugs).toContain('https://granite-speech-3.3-8b.chutes.ai');
		expect(slugs).toContain('https://parakeet-tdt-0.6b.chutes.ai');
	});

	test('should include foundational models (Wav2Vec, NeMo, SpeechBrain, Vosk, Kaldi)', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://wav2vec2-large.chutes.ai');
		expect(slugs).toContain('https://nemo-asr-conformer.chutes.ai');
		expect(slugs).toContain('https://speechbrain-asr.chutes.ai');
		expect(slugs).toContain('https://vosk-model-en.chutes.ai');
		expect(slugs).toContain('https://kaldi-asr.chutes.ai');
	});

	test('should include advanced architectures (Conformer, HuBERT, SeamlessM4T, MMS, Moonshine, Julius)', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).toContain('https://conformer-transducer.chutes.ai');
		expect(slugs).toContain('https://hubert-large.chutes.ai');
		expect(slugs).toContain('https://seamlessm4t-large.chutes.ai');
		expect(slugs).toContain('https://mms-1b-all.chutes.ai');
		expect(slugs).toContain('https://moonshine-base.chutes.ai');
		expect(slugs).toContain('https://julius-asr.chutes.ai');
	});

	test('should exclude TTS chutes', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://kokoro-82m.chutes.ai');
	});

	test('should exclude music chutes', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://diffrhythm.chutes.ai');
	});

	test('should exclude LLM chutes', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://qwen-qwen3-32b.chutes.ai');
	});

	test('should exclude private STT chutes', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		const slugs = result.map(c => c.value);
		expect(slugs).not.toContain('https://private-whisper.chutes.ai');
	});

	test('should return all 20 public STT chutes', async () => {
		const result = await loadChutes.getSTTChutes.call(mockContext as ILoadOptionsFunctions);

		expect(result.length).toBe(20);
	});
});

