/**
 * Shared Chute Filtering Utilities
 * 
 * This module contains the chute filtering logic used by both:
 * - global-warmup.ts (for initial warmup)
 * - test-helpers.ts (for dynamic failover)
 */

export interface ChuteInfo {
	chute_id: string;
	slug: string;
	name: string;
	standard_template?: string;
	description?: string;
	tagline?: string;
}

/**
 * Filter chutes by type
 * Uses the same sophisticated filtering as ai-sdk-provider-chutes
 */
export function filterChutesByType(chutes: ChuteInfo[], type: string): ChuteInfo[] {
	const lowerType = type.toLowerCase();

	switch (lowerType) {
		case 'llm':
			return chutes.filter(c => {
				const template = c.standard_template?.toLowerCase() || '';
				const name = c.name?.toLowerCase() || '';
				return (
					template === 'vllm' || // vLLM template for text generation
					name.includes('llm') ||
					name.includes('gpt') ||
					name.includes('claude')
				);
			});

		case 'image':
			return chutes.filter(c => {
				const template = c.standard_template?.toLowerCase() || '';
				const name = c.name?.toLowerCase() || '';
				const description = c.description?.toLowerCase() || '';
				const tagline = c.tagline?.toLowerCase() || '';

				// First, exclude LLM/text generation models
				const isLLM = template === 'vllm' || 
					name.includes('llm') ||
					name.includes('gpt') ||
					name.includes('claude') ||
					name.includes('gemma') ||
					name.includes('qwen') ||  // Qwen is an LLM family
					name.includes('mistral') ||
					name.includes('deepseek');

				if (isLLM) {
					return false;
				}

				// Exclude video generation models (including image-to-video)
				const isVideo = template === 'video' ||
					name.includes('video') ||
					name.includes('i2v') || // image-to-video
					name.includes('img2vid') ||
					description.includes('video') ||
					tagline.includes('video');

				if (isVideo) {
					return false;
				}

				// Exclude moderation/classification chutes
				const isModeration = template === 'moderation' ||
					name.includes('moderation') ||
					name.includes('classifier') ||
					name.includes('nsfw') ||
					name.includes('content-safety') ||
					name.includes('hate-speech');

				if (isModeration) {
					return false;
				}

				// Then match image generation models
				return (
					template === 'diffusion' || // Diffusion models template
					name.includes('flux') ||
					name.includes('sdxl') ||
					name.includes('sd-') || // stable-diffusion shorthand
					name.includes('stable') ||
					name.includes('dall-e') ||
					name.includes('dall-') ||
					description.includes('image generation') ||
					tagline.includes('image')
				);
			});

		case 'tts':
		case 'text-to-speech':
			return chutes.filter(c => {
				const template = c.standard_template?.toLowerCase() || '';
				const name = c.name?.toLowerCase() || '';
				const description = c.description?.toLowerCase() || '';
				const tagline = c.tagline?.toLowerCase() || '';

				return (
					template === 'tts' ||
					template === 'kokoro' ||
					name.includes('tts') ||
					name.includes('text-to-speech') ||
					name.includes('speech synthesis') ||
					name.includes('kokoro') ||
					description.includes('text-to-speech') ||
					description.includes('speech synthesis') ||
					tagline.includes('text-to-speech')
				);
			});

		case 'stt':
		case 'speech-to-text':
			return chutes.filter(c => {
				const template = c.standard_template?.toLowerCase() || '';
				const name = c.name?.toLowerCase() || '';
				const description = c.description?.toLowerCase() || '';
				const tagline = c.tagline?.toLowerCase() || '';

				return (
					template === 'stt' ||
					template === 'whisper' ||
					name.includes('stt') ||
					name.includes('speech-to-text') ||
					name.includes('transcription') ||
					name.includes('whisper') ||
					description.includes('speech-to-text') ||
					description.includes('transcription') ||
					tagline.includes('speech-to-text')
				);
			});

		case 'video':
			return chutes.filter(c => {
				const template = c.standard_template?.toLowerCase() || '';
				const name = c.name?.toLowerCase() || '';
				const description = c.description?.toLowerCase() || '';
				const tagline = c.tagline?.toLowerCase() || '';

				// Exclude vision-language models (VL) - they're not video generation
				const isVisionLanguage = name.includes('-vl-') || 
					name.includes('vision') || 
					description.includes('vision-language') ||
					description.includes('visual language model') ||
					template === 'vllm';

				if (isVisionLanguage) {
					return false;
				}

				return (
					template === 'video' ||
					template === 'video-generation' ||
					name.includes('video-gen') ||
					name.includes('t2v') || // text-to-video
					name.includes('i2v') || // image-to-video
					name.includes('text2video') ||
					name.includes('text-to-video') ||
					name.includes('img2vid') ||
					name.includes('image2video') ||
					name.includes('image-to-video') ||
					name.includes('video-diffusion') ||
					name.includes('videogen') ||
					name.includes('wan') ||
					name.includes('mochi') ||
					name.includes('hunyuan') ||
					description.includes('video generation') ||
					description.includes('text-to-video') ||
					description.includes('image-to-video') ||
					description.includes('generate video') ||
					description.includes('video synthesis') ||
					tagline.includes('video generation') ||
					tagline.includes('text-to-video')
				);
			});

		case 'music':
		case 'audio':
			return chutes.filter(c => {
				const template = c.standard_template?.toLowerCase() || '';
				const name = c.name?.toLowerCase() || '';
				const description = c.description?.toLowerCase() || '';
				const tagline = c.tagline?.toLowerCase() || '';
				
				// Exclude TTS and STT models
				const isTTS = template === 'tts' || template === 'kokoro' || 
					name.includes('tts') || name.includes('kokoro') || name.includes('text-to-speech');
				const isSTT = template === 'stt' || template === 'whisper' || 
					name.includes('stt') || name.includes('whisper') || name.includes('speech-to-text');
				
				if (isTTS || isSTT) {
					return false;
				}
				
				return (
					template === 'music' ||
					template === 'audio' ||
					name.includes('music') ||
					name.includes('audio-gen') ||
					name.includes('audiogen') ||
					description.includes('music generation') ||
					description.includes('audio generation') ||
					tagline.includes('music') ||
					tagline.includes('audio generation')
				);
			});

		case 'embeddings':
		case 'embedding':
			return chutes.filter(c => {
				const template = c.standard_template?.toLowerCase() || '';
				const name = c.name?.toLowerCase() || '';
				const description = c.description?.toLowerCase() || '';
				const tagline = c.tagline?.toLowerCase() || '';
				
				return (
					template === 'tei' || // Text Embeddings Inference template
					name.includes('embed') ||
					description.includes('embed') ||
					tagline.includes('embed')
				);
			});

	case 'moderation':
	case 'content-moderation':
		return chutes.filter(c => {
			const template = c.standard_template?.toLowerCase() || '';
			const name = c.name?.toLowerCase() || '';
			const description = c.description?.toLowerCase() || '';
			const tagline = c.tagline?.toLowerCase() || '';
			
			return (
				template === 'moderation' ||
				name.includes('moderation') ||
				name.includes('content-moderation') ||
				name.includes('nsfw') ||
				name.includes('classifier') ||
				name.includes('hate-speech') ||
				name.includes('content-safety') ||
				name.includes('safety') ||
				description.includes('content moderation') ||
				description.includes('nsfw') ||
				description.includes('hate speech') ||
				description.includes('content safety') ||
				tagline.includes('moderation') ||
				tagline.includes('nsfw') ||
				tagline.includes('hate speech')
			);
		}).sort((a, b) => {
			// Prioritize specific classifier chutes over LLM-based guards
			const aName = a.name.toLowerCase();
			const bName = b.name.toLowerCase();
			
			// nsfw-classifier and hate-speech-detector are the specific classifiers we want
			const aIsSpecificClassifier = aName === 'nsfw-classifier' || aName === 'hate-speech-detector';
			const bIsSpecificClassifier = bName === 'nsfw-classifier' || bName === 'hate-speech-detector';
			
			// Prioritize specific classifiers
			if (aIsSpecificClassifier && !bIsSpecificClassifier) return -1;
			if (!aIsSpecificClassifier && bIsSpecificClassifier) return 1;
			
			// Otherwise maintain original order
			return 0;
		});

		default:
			return chutes;
	}
}

