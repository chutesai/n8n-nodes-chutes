/**
 * Load available chutes dynamically from Chutes.ai API
 */

import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface ChuteOption {
	chute_id: string;
	name: string;
	tagline?: string;
	description?: string;
	slug: string;
	standard_template?: string;
	user?: {
		username: string;
	};
	public: boolean;
}

export interface ChutesListResponse {
	total: number;
	page: number;
	limit: number;
	items: ChuteOption[];
	cord_refs: Record<string, any>;
}

/**
 * Construct the full API URL for a chute from its slug
 * 
 * @param slug - Chute slug (e.g., "chutes-deepseek-ai-deepseek-r1")
 * @returns Full chute URL (e.g., "https://chutes-deepseek-ai-deepseek-r1.chutes.ai")
 */
export function getChuteUrl(slug: string): string {
	return `https://${slug}.chutes.ai`;
}

/**
 * Load raw chutes data from API
 * @internal - Use specific functions like getLLMChutes() instead
 */
async function getRawChutes(
	context: ILoadOptionsFunctions,
	includePublic = true,
	limit = 500,
): Promise<ChuteOption[]> {
	const credentials = await context.getCredentials('chutesApi');

	const queryParams = new URLSearchParams({
		include_public: String(includePublic),
		limit: String(limit),
	});

	const response = await context.helpers.request({
		method: 'GET',
		url: `https://api.chutes.ai/chutes/?${queryParams}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
		json: true,
	});

	const chutesData = response as ChutesListResponse;
	return chutesData.items || [];
}

/**
 * Format chute data for n8n dropdown
 */
function formatChuteOption(chute: ChuteOption): INodePropertyOptions {
	return {
		name: chute.tagline ? `${chute.name} - ${chute.tagline.substring(0, 80)}...` : chute.name,
		value: getChuteUrl(chute.slug),
		description: `${chute.standard_template || 'none'} | @${chute.user?.username || 'unknown'}`,
	};
}

/**
 * Load all available chutes (user's + public)
 * 
 * @param this - n8n load options context
 * @param includePublic - Whether to include public chutes (default: true)
 * @param limit - Maximum number of chutes to return (default: 100)
 * @returns Array of chute options for n8n dropdown
 */
export async function getChutes(
	this: ILoadOptionsFunctions,
	includePublic = true,
	limit = 500,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, includePublic, limit);
		
		if (chutes.length === 0) {
			console.warn('No chutes returned from Chutes.ai API');
		}

		return chutes.map(formatChuteOption);
	} catch (error) {
		console.error('Failed to load chutes from Chutes.ai API:', error);
		return [];
	}
}

/**
 * Load chutes filtered by type/template
 * 
 * @param this - n8n load options context
 * @param template - Filter by standard_template (e.g., 'vllm', 'diffusion')
 * @returns Array of filtered chute options
 */
export async function getChutesByType(
	this: ILoadOptionsFunctions,
	template?: string,
): Promise<INodePropertyOptions[]> {
	const allChutes = await getChutes.call(this, true, 100);

	if (!template) {
		return allChutes;
	}

	// Filter by template in description
	return allChutes.filter((chute) =>
		chute.description?.toLowerCase().includes(template.toLowerCase()),
	);
}

/**
 * Load LLM-specific chutes (text generation models)
 * Uses standard_template field to identify vLLM models (language models)
 * Dynamically filters based on API template classification
 */
export async function getLLMChutes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, true, 500);
		
		// Filter for public vLLM template chutes (language models)
		const llmChutes = chutes.filter((chute) => {
			const template = chute.standard_template?.toLowerCase() || '';
			
			// Must be public and have vLLM template
			return chute.public && template === 'vllm';
		});
		
		return llmChutes.map(formatChuteOption);
	} catch (error) {
		console.error('Failed to load LLM chutes:', error);
		return [];
	}
}

/**
 * Load Image Generation chutes
 * Uses standard_template field to identify diffusion models (image generation)
 * Dynamically filters based on API template classification
 */
export async function getImageChutes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, true, 500);
		
		// Get current operation if available (for smart sorting)
		let operation: string | undefined;
		try {
			operation = this.getCurrentNodeParameter('operation') as string;
		} catch {
			// Operation not set yet, that's okay - use default order
		}
		
		// Filter for image generation chutes using permissive logic
		const imageChutes = chutes.filter((chute) => {
			const template = chute.standard_template?.toLowerCase() || '';
			const name = chute.name?.toLowerCase() || '';
			const tagline = chute.tagline?.toLowerCase() || '';
			
			// Must be public
			if (!chute.public) return false;
			
			// Exclude LLM chutes by template
			if (template === 'vllm') return false;
			
			// Exclude embedding chutes
			if (template === 'tei' || template === 'embedding') return false;
			
			// Exclude video chutes
			const isVideo = template === 'video' ||
				name.includes('video') ||
				name.includes('i2v') || // image-to-video
				name.includes('img2vid') ||
				tagline.includes('video');
			if (isVideo) return false;
			
			// Include if template is diffusion OR has image-related keywords
			return (
				template === 'diffusion' ||
				
				// Generic image keywords
				name.includes('image') || // Includes qwen-image-edit, z-image-turbo, etc.
				
				// Top 20 image model families (research-backed, future-proof)
				name.includes('flux') || // FLUX (Black Forest Labs) - dev/schnell/kontext
				name.includes('stable-diffusion') || // Stable Diffusion 3/3.5
				name.includes('sdxl') || // Stable Diffusion XL variants
				name.includes('sd-') || // SD shorthand
				name.includes('stable') || // Stable AI models
				name.includes('hidream') || // HiDream-I1 (17B params, MoE)
				name.includes('pixart') || // PixArt-Alpha/Sigma
				name.includes('kandinsky') || // Kandinsky (Sber AI)
				name.includes('deepfloyd') || // DeepFloyd IF
				name.includes('kolors') || // Kolors (Kwai)
				name.includes('hunyuan') || // HunyuanImage (Tencent) - video already excluded above
				name.includes('playground') || // Playground 2.5
				name.includes('controlnet') || // ControlNet variants
				name.includes('animagine') || // Animagine XL
				name.includes('cascade') || // Stable Cascade
				name.includes('waifu') || // Waifu Diffusion
				name.includes('fooocus') || // Fooocus
				name.includes('omnigen') || // OmniGen
				name.includes('sana') || // Sana
				name.includes('lumina') || // Lumina
				name.includes('dall-e') || // DALL-E variants
				name.includes('dall-') ||
				
				// XL variants and mixes (from previous work)
				name.endsWith('xl') || // SDXL variants: NovaFurryXL, HassakuXL, etc.
				name.endsWith('mix') || // Model mixes: iLustMix, etc.
				
				// Tagline/description checks
				tagline.includes('image generation') ||
				tagline.includes('image editing') ||
				tagline.includes('anime') || // Anime generation models
				tagline.includes('art') || // Art generation models
				tagline.includes('illustration') || // Illustration models
				tagline.includes('portrait') || // Portrait generation
				tagline.includes('character generation') // Character generation
			);
		});
		
		// Convert to options
		const options = imageChutes.map(formatChuteOption);
		
		// Smart sorting: when operation is "edit", prioritize edit-capable chutes
		if (operation === 'edit') {
			return options.sort((a, b) => {
				const aName = a.name.toLowerCase();
				const bName = b.name.toLowerCase();
				
			// Check for edit-related keywords
			const aHasEdit = aName.includes('edit') || aName.includes('inpaint') ||
				aName.includes('outpaint') || aName.includes('img2img');
			const bHasEdit = bName.includes('edit') || bName.includes('inpaint') ||
				bName.includes('outpaint') || bName.includes('img2img');
				
				// Sort edit-capable chutes to the top
				if (aHasEdit && !bHasEdit) return -1;
				if (!aHasEdit && bHasEdit) return 1;
				return 0; // Keep original order for same priority
			});
		}
		
		return options; // Default order for "generate" or undefined operation
	} catch (error) {
		console.error('Failed to load image chutes:', error);
		return [];
	}
}

/**
 * Load Video Generation chutes
 * Filters for video generation models
 */
export async function getVideoChutes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, true, 500);
		
		// Filter for public video generation chutes (keyword-based, no template yet)
		const videoChutes = chutes.filter((chute) => {
			if (!chute.public) return false;
			
			const template = chute.standard_template?.toLowerCase() || '';
			const name = chute.name?.toLowerCase() || '';
			const desc = chute.description?.toLowerCase() || '';
			const tagline = chute.tagline?.toLowerCase() || '';
			
		// Exclude models with "image" in the name (unless they also have video keywords)
		if (name.includes('image') &&
			!name.includes('video') &&
			!name.includes('i2v') &&
			!name.includes('img2vid') &&
			!name.includes('image-to-video') &&
			!name.includes('image2video')) {
			return false;
		}
			
			// Exclude image-only models (diffusion template without video keywords)
			if (template === 'diffusion' && !name.includes('video') && !desc.includes('video')) {
				return false;
			}
			
			// Exclude LLMs
			if (template === 'vllm') return false;
			
			// Include video generation models
			return (
				// Generic video keywords
				name.includes('video') ||
				name.includes('i2v') || // image-to-video
				name.includes('img2vid') ||
				name.includes('t2v') || // text-to-video
				name.includes('text2video') ||
				
				// Top 20 video model families (research-backed, future-proof)
				name.includes('wan') || // Wan (Alibaba) - Wan 2.1, Wan-2.2
				name.includes('hunyuan') || // HunyuanVideo (Tencent)
				name.includes('cogvideo') || // CogVideoX, CogVideo (Tsinghua)
				name.includes('mochi') || // Mochi (Genmo)
				name.includes('ltx') || // LTX-Video (Lightricks)
				name.includes('svd') || // Stable Video Diffusion
				name.includes('sora') || // Open-Sora, Sora implementations
				name.includes('skyreels') || // SkyReels (Skywork AI)
				name.includes('stepvideo') || // StepVideo-T2V
				name.includes('pyramid') || // Pyramid Flow
				name.includes('animatediff') || // AnimateDiff
				name.includes('modelscope') || // ModelScope (Alibaba/DAMO)
				name.includes('videocrafter') || // VideoCrafter (Tencent)
				name.includes('allegro') || // Allegro (Rhymes AI)
				name.includes('zeroscope') || // Zeroscope
				name.includes('show-1') || // Show-1 (NUS ShowLab)
				name.includes('lavie') || // LaVie
				
				// Description/tagline checks
				desc.includes('video') ||
				desc.includes('generate video') ||
				desc.includes('video generation') ||
				desc.includes('image to video') ||
				desc.includes('text to video') ||
				desc.includes('text-to-video') ||
				desc.includes('image-to-video') ||
				desc.includes('cinematic') || // Common in video descriptions
				desc.includes('motion') || // AnimateDiff, motion-based models
				tagline.includes('video') ||
				tagline.includes('cinematic')
			);
		});
		
		return videoChutes.map(formatChuteOption);
	} catch (error) {
		console.error('Failed to load video chutes:', error);
		return [];
	}
}

/**
 * Load Text-to-Speech chutes
 * Filters for TTS models (like Kokoro)
 */
export async function getTTSChutes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, true, 500);
		
		// Filter for public TTS chutes (keyword-based, no template yet)
		const ttsChutes = chutes.filter((chute) => {
			if (!chute.public) return false;
			
			const name = chute.name?.toLowerCase() || '';
			const desc = chute.description?.toLowerCase() || '';
			const tagline = chute.tagline?.toLowerCase() || '';
			
		// Exclude STT (opposite direction)
		const isSTT = name.includes('whisper') || name.includes('stt') ||
			desc.includes('speech to text') || desc.includes('transcription') ||
			desc.includes('speech recognition');
		if (isSTT) return false;
			
			// Exclude music generation (different audio category)
			const isMusic = name.includes('music') || name.includes('song') ||
							desc.includes('music generation') || desc.includes('song generation');
			if (isMusic) return false;
			
			// Include TTS models
			return (
				// Generic TTS keywords
				name.includes('tts') ||
				name.includes('text-to-speech') ||
				
				// Top 20 TTS model families (research-backed, future-proof)
				name.includes('fish') || // Fish Speech (Fish Audio) - V1.5 DualAR
				name.includes('chatterbox') || // Chatterbox (Resemble AI)
				name.includes('xtts') || // XTTS-v2 (Coqui) - voice cloning
				name.includes('kokoro') || // Kokoro - 82M lightweight
				name.includes('orpheus') || // Orpheus - Llama-based
				name.includes('vibevoice') || // VibeVoice (Microsoft)
				name.includes('dia') || // Dia (Nari Labs) - dialogue
				name.includes('cosyvoice') || // CosyVoice2 (Alibaba)
				name.includes('bark') || // Bark (Suno) - multilingual
				name.includes('styletts') || // StyleTTS 2 - diffusion-based
				name.includes('tortoise') || // Tortoise TTS - highest quality
				name.includes('piper') || // Piper - fast local TTS
				name.includes('openaudio') || // OpenAudio S1
				name.includes('f5-tts') || // F5-TTS - flow matching
				name.includes('vits') || // VITS - foundational model
				name.includes('gpt-sovits') || // GPT-SoVITS - voice cloning
				name.includes('sovits') || // SoVITS variants
				name.includes('melotts') || // MeloTTS (MyShell)
				name.includes('openvoice') || // OpenVoice (MyShell)
				name.includes('parler') || // Parler-TTS - controllable
				name.includes('indextts') || // IndexTTS-2 - duration control
				
				// Description/tagline checks
				desc.includes('text to speech') ||
				desc.includes('text-to-speech') ||
				desc.includes('speech synthesis') ||
				desc.includes('voice synthesis') ||
				desc.includes('voice cloning') ||
				desc.includes('tts model') ||
				tagline.includes('tts') ||
				tagline.includes('speech synthesis') ||
				tagline.includes('voice cloning')
			);
		});
		
		return ttsChutes.map(formatChuteOption);
	} catch (error) {
		console.error('Failed to load TTS chutes:', error);
		return [];
	}
}

/**
 * Load Speech-to-Text chutes
 * Filters for STT models (like Whisper)
 */
export async function getSTTChutes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, true, 500);
		
		// Filter for public STT chutes (keyword-based, no template yet)
		const sttChutes = chutes.filter((chute) => {
			if (!chute.public) return false;
			
			const name = chute.name?.toLowerCase() || '';
			const desc = chute.description?.toLowerCase() || '';
			const tagline = chute.tagline?.toLowerCase() || '';
			
		// Exclude TTS (opposite direction)
		const isTTS = (name.includes('tts') || name.includes('text-to-speech') ||
			desc.includes('text to speech') || desc.includes('speech synthesis')) &&
			!desc.includes('speech to text'); // but allow if it mentions STT
		if (isTTS) return false;
			
			// Exclude music generation models
			const isMusic = name.includes('music') || name.includes('song') ||
							name.includes('diffrhythm') || name.includes('musicgen') ||
							desc.includes('music generation') || desc.includes('generate music');
			if (isMusic) return false;
			
			// Include STT models
			return (
				// Generic STT keywords
				name.includes('stt') ||
				name.includes('speech-to-text') ||
				name.includes('asr') || // Automatic Speech Recognition
				
				// Top 20 STT/ASR model families (research-backed, future-proof)
				name.includes('whisper') || // Whisper (OpenAI) - gold standard, variants: turbo, faster, cpp, distil
				name.includes('voxtral') || // Voxtral (Mistral) - SOTA, beats Whisper
				name.includes('canary') || // Canary Qwen (NVIDIA) - #1 on leaderboard, 5.63% WER
				name.includes('granite') || // Granite Speech (IBM) - #2, enterprise
				name.includes('parakeet') || // Parakeet (NVIDIA) - blazing fast, RTFx 3386
				name.includes('wav2vec') || // Wav2Vec 2.0 (Meta) - self-supervised
				name.includes('nemo') || // NeMo ASR (NVIDIA) - full toolkit
				name.includes('speechbrain') || // SpeechBrain - end-to-end
				name.includes('vosk') || // Vosk (Alpha Cephei) - lightweight, offline
				name.includes('kaldi') || // Kaldi - classic pipeline
				name.includes('conformer') || // Conformer (Google) - hybrid architecture
				name.includes('hubert') || // HuBERT (Meta) - self-supervised
				name.includes('seamlessm4t') || // SeamlessM4T (Meta) - multilingual translation
				name.includes('mms') || // MMS (Meta) - 1000+ languages
				name.includes('moonshine') || // Moonshine - efficient on-device
				name.includes('julius') || // Julius - lightweight multilingual
				
				// Description/tagline checks
				desc.includes('speech to text') ||
				desc.includes('speech-to-text') ||
				desc.includes('transcription') ||
				desc.includes('transcribe') ||
				desc.includes('audio to text') ||
				desc.includes('speech recognition') ||
				tagline.includes('speech recognition') ||
				tagline.includes('transcription')
			);
		});
		
		return sttChutes.map(formatChuteOption);
	} catch (error) {
		console.error('Failed to load STT chutes:', error);
		return [];
	}
}

/**
 * Load Music Generation chutes
 * Filters for music/audio generation models
 */
export async function getMusicChutes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, true, 500);
		
		// Filter for public music generation chutes (keyword-based, no template yet)
		const musicChutes = chutes.filter((chute) => {
			if (!chute.public) return false;
			
			const name = chute.name?.toLowerCase() || '';
			const desc = chute.description?.toLowerCase() || '';
			const tagline = chute.tagline?.toLowerCase() || '';
			
		// Exclude TTS/STT (different audio category)
		const isSpeech = name.includes('whisper') || name.includes('kokoro') ||
			name.includes('tts') || name.includes('stt') ||
			name.includes('speech') ||
			desc.includes('text to speech') || desc.includes('speech to text') ||
			desc.includes('transcription');
		if (isSpeech) return false;
			
			// Include music generation models
			return (
				// Generic music keywords
				name.includes('music') ||
				name.includes('song') ||
				name.includes('audio generation') ||
				
				// Top 20 music model families (research-backed, future-proof)
				name.includes('musicgen') || // MusicGen (Meta AudioCraft) - widely adopted
				name.includes('yue') || // YuE (HKUST/M-A-P) - full-song with vocals
				name.includes('ace-step') || // ACE-Step - "Stable Diffusion for music"
				name.includes('diffrhythm') || // DiffRhythm - fast latent diffusion
				name.includes('stable-audio') || // Stable Audio Open (Stability AI)
				name.includes('audioldm') || // AudioLDM / AudioLDM 2
				name.includes('jukebox') || // Jukebox (OpenAI) - raw audio with vocals
				name.includes('riffusion') || // Riffusion - real-time spectrograms
				name.includes('audiogen') || // AudioGen (Meta) - sound effects
				name.includes('songgen') || // SongGen - autoregressive
				name.includes('rave') || // RAVE (IRCAM) - real-time VAE
				name.includes('musecoco') || // MuseCoco (Microsoft) - symbolic
				name.includes('museformer') || // Museformer (Microsoft)
				name.includes('magenta') || // Magenta (Google) - TensorFlow toolkit
				name.includes('musiclm') || // MusicLM (Google)
				name.includes('encodec') || // EnCodec (Meta) - neural codec foundation
				name.includes('audiodiffusion') || // AudioDiffusion library
				name.includes('dance-diffusion') || // Dance Diffusion
				name.includes('mousai') || // Moûsai - efficient diffusion
				name.includes('musicagent') || // MusicAgent (Microsoft) - multi-tool
				
				// Description/tagline checks
				desc.includes('music') ||
				desc.includes('song') ||
				desc.includes('generate music') ||
				desc.includes('music generation') ||
				desc.includes('audio generation') ||
				tagline.includes('music') ||
				tagline.includes('song') ||
				tagline.includes('audio generation')
			);
		});
		
		return musicChutes.map(formatChuteOption);
	} catch (error) {
		console.error('Failed to load music chutes:', error);
		return [];
	}
}

/**
 * Load Embeddings chutes
 * Filters for TEI template and embedding models
 */
export async function getEmbeddingChutes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, true, 500);
		
		// Filter for public embedding chutes
		const embeddingChutes = chutes.filter((chute) => {
			if (!chute.public) return false;
			
			const template = chute.standard_template?.toLowerCase() || '';
			const name = chute.name?.toLowerCase() || '';
			const desc = chute.description?.toLowerCase() || '';
			
			// Template-based filtering (preferred)
			if (template === 'embedding' || template === 'tei') return true;
			
		// Exclude LLM chutes (vllm template or obvious LLM keywords)
		const isLLM = template === 'vllm' ||
			name.includes('llm') ||
			desc.includes('language model') ||
			desc.includes('text generation');
		if (isLLM) return false;
			
			// Exclude image generation chutes
			const isImage = template === 'diffusion' ||
							name.includes('stable-diffusion') ||
							name.includes('flux') ||
							desc.includes('image generation');
			if (isImage) return false;
			
			// Keyword fallback for chutes without template
			return (
				// Generic embedding keywords
				name.includes('embedding') ||
				name.includes('embed') ||
				
				// Top 20 embedding model families (research-backed, future-proof)
				name.includes('qwen') && name.includes('embed') || // Qwen3-Embedding (Alibaba) - 0.6B-8B, multilingual
				name.includes('bge') || // BGE/BGE-M3 (BAAI) - Beijing Academy of AI, multilingual/Chinese
				name.includes('e5') || // E5 (Microsoft) - base/large/mistral variants
				name.includes('nomic') && name.includes('embed') || // Nomic Embed (Nomic AI) - MoE, 8K context
				name.includes('gte') || // GTE (Alibaba) - General Text Embeddings
				name.includes('jina') && name.includes('embed') || // Jina Embeddings (Jina AI) - 8K context, adapters
				name.includes('mxbai') || // mxbai-embed (Mixedbread AI) - beats OpenAI
				name.includes('minilm') || // all-MiniLM (Sentence Transformers) - 200M+ downloads
				name.includes('mpnet') || // all-mpnet (Sentence Transformers) - higher quality
				name.includes('instructor') || // Instructor (HKUNLP) - instruction-tuned
				name.includes('uae') || // UAE (WhereIsAI) - Universal AnglE Embedding
				name.includes('sfr') && name.includes('embed') || // SFR-Embedding (Salesforce) - strong retrieval
				name.includes('stella') || // Stella - compact high-performer
				name.includes('embeddinggemma') || // EmbeddingGemma (Google) - Matryoshka, 100+ languages
				name.includes('arctic') && name.includes('embed') || // Snowflake Arctic Embed
				name.includes('nv-embed') || // NV-Embed (NVIDIA) - enterprise
				name.includes('gist') || // GIST - Guided In-context Self-Training
				name.includes('contriever') || // Contriever (Meta) - unsupervised dense retrieval
				name.includes('colbert') || // ColBERT v2 - late interaction
				name.includes('dragon') || // DRAGON (Meta) - dense retriever
				name.includes('sentence-transformer') || // Sentence Transformers family
				
				// Description/tagline checks
				desc.includes('embedding') ||
				desc.includes('embeddings') ||
				desc.includes('vector') ||
				desc.includes('semantic search') ||
				desc.includes('text embedding')
			);
		});
		
		return embeddingChutes.map(formatChuteOption);
	} catch (error) {
		console.error('Failed to load embedding chutes:', error);
		return [];
	}
}

/**
 * Load Content Moderation chutes
 * Filters for moderation/safety models
 */
export async function getModerationChutes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const chutes = await getRawChutes(this, true, 500);
		
		// Filter for public moderation chutes
		const moderationChutes = chutes.filter((chute) => {
			if (!chute.public) return false;
			
			const template = chute.standard_template?.toLowerCase() || '';
			const name = chute.name?.toLowerCase() || '';
			const desc = chute.description?.toLowerCase() || '';
			
			// Template-based filtering (preferred)
			if (template === 'moderation') return true;
			
		// Exclude LLM text generation chutes (vllm template)
		const isLLM = template === 'vllm' &&
			!name.includes('guard') &&
			!name.includes('safety') &&
			!name.includes('shield');
		if (isLLM) return false;
			
			// Exclude embedding chutes
			const isEmbedding = template === 'tei' || template === 'embedding';
			if (isEmbedding) return false;
			
			// Keyword fallback for chutes without template
			return (
				// Generic moderation keywords
				name.includes('moderation') ||
				name.includes('safety') ||
				
				// Top 20 content moderation model families (research-backed, future-proof)
				// LLM-Based Safety Guards
				name.includes('llama-guard') || name.includes('llamaguard') || // Llama Guard (Meta) - 1B-12B, multimodal
				name.includes('shieldgemma') || name.includes('shield-gemma') || // ShieldGemma (Google) - outperforms Llama Guard
				name.includes('granite-guardian') || name.includes('granite') && name.includes('guard') || // Granite Guardian (IBM) - enterprise
				name.includes('wildguard') || // WildGuard - open guardrail
				name.includes('nemo-guardrails') || name.includes('guardrails') || // NeMo Guardrails (NVIDIA)
				name.includes('gpt-oss-safeguard') || name.includes('safeguard') || // GPT-OSS-Safeguard - 20B/120B
				
				// Text Toxicity/Hate Speech
				name.includes('detoxify') || // Detoxify - RoBERTa-based, Jigsaw
				name.includes('toxicbert') || name.includes('toxic-bert') || // ToxicBERT
				name.includes('hatebert') || name.includes('hate-bert') || // HateBERT - hate speech
				name.includes('perspective') || // Perspective API (Google/Jigsaw)
				name.includes('unitary') && name.includes('toxic') || // Unitary Detoxify
				name.includes('toxicity') || // Generic toxicity detection
				name.includes('hate-speech') || name.includes('hatespeech') ||
				
				// Image/NSFW Detection
				name.includes('nsfw') || // NSFW Detection (Falcons AI, ViT-based)
				name.includes('nudenet') || name.includes('nude-net') || // NudeNet
				name.includes('clip') && name.includes('nsfw') || // CLIP-based NSFW
				name.includes('safety-checker') || name.includes('safetychecker') || // Stable Diffusion Safety Checker
				
				// Prompt Security
				name.includes('prompt-guard') || name.includes('promptguard') || // Prompt Guard (Meta) - injection/jailbreak
				name.includes('rebuff') || // Rebuff - prompt injection
				name.includes('llama-firewall') || name.includes('llamafirewall') || // LlamaFirewall (Meta)
				
				// Specialized
				name.includes('codeshield') || name.includes('code-shield') || // CodeShield (Meta) - insecure code detection
				
				// Description/tagline checks
				desc.includes('moderation') ||
				desc.includes('content moderation') ||
				desc.includes('safety') ||
				desc.includes('toxic') ||
				desc.includes('hate speech') ||
				desc.includes('guardrail') ||
				desc.includes('nsfw') ||
				desc.includes('prompt injection')
			);
		});
		
		return moderationChutes.map(formatChuteOption);
	} catch (error) {
		console.error('Failed to load moderation chutes:', error);
		return [];
	}
}

