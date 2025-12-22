/**
 * Integration Test Helpers for n8n-nodes-chutes
 * 
 * Provides shared utilities for integration tests that hit the real Chutes.ai API.
 * Uses dynamic chute discovery following ai-sdk-provider-chutes patterns.
 */

import 'dotenv/config';
import type { ChuteInfo as SharedChuteInfo } from '../setup/chute-filters';

// =============================================================================
// VIDEO CHUTE CAPABILITY DETECTION
// =============================================================================

/**
 * Check if a video chute supports text-to-video generation
 * 
 * Looks for indicators like:
 * - "T2V" or "t2v" in name
 * - "text-to-video" or "text2video" in name/description/tagline
 * - "Text and image" indicates dual support (supports both)
 * 
 * @param chute - Chute info from API
 * @returns true if the chute supports text-to-video
 */
export function supportsTextToVideo(chute: Partial<SharedChuteInfo>): boolean {
	const name = (chute.name || '').toLowerCase();
	const description = (chute.description || '').toLowerCase();
	const tagline = (chute.tagline || '').toLowerCase();
	
	// Check for T2V indicators
	const hasT2V = name.includes('t2v') || 
	               name.includes('text2video') || 
	               name.includes('text-to-video') ||
	               name.includes('text to video');
	
	// Check for dual support (text and image)
	const hasDualSupport = name.includes('text and image') ||
	                       description.includes('text and image') ||
	                       tagline.includes('text and image');
	
	// Check description/tagline for text-to-video mentions
	const hasT2VInDescription = description.includes('text-to-video') ||
	                            description.includes('text2video') ||
	                            description.includes('generate videos from text') ||
	                            tagline.includes('text-to-video') ||
	                            tagline.includes('text2video');
	
	return hasT2V || hasDualSupport || hasT2VInDescription;
}

/**
 * Check if a video chute supports image-to-video generation
 * 
 * Looks for indicators like:
 * - "I2V" or "i2v" in name
 * - "image-to-video" or "img2vid" in name/description/tagline
 * - "Text and image" indicates dual support
 * - Most T2V models also support I2V (common pattern)
 * 
 * @param chute - Chute info from API
 * @returns true if the chute supports image-to-video
 */
export function supportsImageToVideo(chute: Partial<SharedChuteInfo>): boolean {
	const name = (chute.name || '').toLowerCase();
	const description = (chute.description || '').toLowerCase();
	const tagline = (chute.tagline || '').toLowerCase();
	
	// Check for I2V indicators
	const hasI2V = name.includes('i2v') || 
	               name.includes('img2vid') || 
	               name.includes('image2video') ||
	               name.includes('image-to-video') ||
	               name.includes('image to video');
	
	// Check for dual support (text and image)
	const hasDualSupport = name.includes('text and image') ||
	                       description.includes('text and image') ||
	                       tagline.includes('text and image');
	
	// Check description/tagline for image-to-video mentions
	const hasI2VInDescription = description.includes('image-to-video') ||
	                            description.includes('img2vid') ||
	                            description.includes('animate images into videos') ||
	                            tagline.includes('image-to-video') ||
	                            tagline.includes('img2vid');
	
	// Most T2V models also support I2V
	const isT2VModel = supportsTextToVideo(chute);
	
	return hasI2V || hasDualSupport || hasI2VInDescription || isT2VModel;
}

// API key check
const { CHUTES_API_KEY: envApiKey } = process.env;
export const CHUTES_API_KEY = envApiKey;

export function hasApiKey(): boolean {
	return !!CHUTES_API_KEY && CHUTES_API_KEY !== 'test_api_key';
}

// Skip helper for integration tests
export function skipIfNoApiKey(): boolean {
	if (!hasApiKey()) {
		console.log('⚠️ Skipping integration test: CHUTES_API_KEY not set');
		return true;
	}
	return false;
}

// Test conditionally based on API key
export const testOrSkip = hasApiKey() ? test : test.skip;
export const describeOrSkip = hasApiKey() ? describe : describe.skip;

// Default timeout for API calls (2 minutes)
export const DEFAULT_TIMEOUT = 120000;

// Extended timeout for slow operations (5 minutes)
export const EXTENDED_TIMEOUT = 300000;

// Short timeout for quick checks (30 seconds)
export const SHORT_TIMEOUT = 30000;

// API base URL for management API
export const API_BASE_URL = 'https://api.chutes.ai';

// =============================================================================
// DYNAMIC CHUTE DISCOVERY
// =============================================================================

export interface ChuteInfo {
	chute_id: string;
	slug: string;
	name: string;
	standard_template?: string;
	description?: string;
	tagline?: string;
}

export interface ChutesAPIResponse {
	total: number;
	items: ChuteInfo[];
}

// Cache for discovered chutes
let cachedChutes: ChuteInfo[] | null = null;

/**
 * Discover all available chutes from the Chutes.ai Management API
 */
export async function discoverChutes(forceRefresh: boolean = false): Promise<ChuteInfo[]> {
	if (!hasApiKey()) {
		throw new Error('CHUTES_API_KEY is required for chute discovery');
	}

	if (cachedChutes && !forceRefresh) {
		return cachedChutes;
	}

	const url = `${API_BASE_URL}/chutes/?include_public=true&limit=500`;
	
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${CHUTES_API_KEY}`,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch chutes: ${response.status} ${response.statusText}`);
		}

		const data = await response.json() as ChutesAPIResponse;
		cachedChutes = data.items || [];
		return cachedChutes;
	} catch (error) {
		console.error('Error discovering chutes:', error);
		throw error;
	}
}

/**
 * Filter chutes by type (llm, image, tts, stt, video, etc.)
 */
export function filterChutesByType(chutes: ChuteInfo[], type: string): ChuteInfo[] {
	const lowerType = type.toLowerCase();

	switch (lowerType) {
		case 'llm':
			return chutes.filter((chute) => {
				const template = chute.standard_template?.toLowerCase() || '';
				const name = chute.name?.toLowerCase() || '';
				return (
					template === 'vllm' ||
					name.includes('llm') ||
					name.includes('deepseek') ||
					name.includes('qwen') ||
					name.includes('llama') ||
					name.includes('mistral')
				);
			});

		case 'image':
			return chutes.filter((chute) => {
				const template = chute.standard_template?.toLowerCase() || '';
				const name = chute.name?.toLowerCase() || '';
				const description = chute.description?.toLowerCase() || '';
				
				// Exclude LLM/video models
				const isLLM = template === 'vllm' || name.includes('llm');
				const isVideo = template === 'video' || name.includes('video') || name.includes('i2v') || name.includes('t2v');
				
				if (isLLM || isVideo) return false;
				
				return (
					template === 'diffusion' ||
					name.includes('flux') ||
					name.includes('sdxl') ||
					name.includes('stable') ||
					name.includes('image') ||
					description.includes('image generation')
				);
			});

		case 'tts':
		case 'text-to-speech':
			return chutes.filter((chute) => {
				const template = chute.standard_template?.toLowerCase() || '';
				const name = chute.name?.toLowerCase() || '';
				return (
					template === 'tts' ||
					template === 'kokoro' ||
					name.includes('tts') ||
					name.includes('kokoro') ||
					name.includes('text-to-speech')
				);
			});

		case 'stt':
		case 'speech-to-text':
			return chutes.filter((chute) => {
				const template = chute.standard_template?.toLowerCase() || '';
				const name = chute.name?.toLowerCase() || '';
				return (
					template === 'stt' ||
					template === 'whisper' ||
					name.includes('stt') ||
					name.includes('whisper') ||
					name.includes('speech-to-text')
				);
			});

		case 'video':
			return chutes.filter((chute) => {
				const template = chute.standard_template?.toLowerCase() || '';
				const name = chute.name?.toLowerCase() || '';
				
				// Exclude vision-language models
				const isVL = name.includes('-vl-') || template === 'vllm';
				if (isVL) return false;
				
				return (
					template === 'video' ||
					name.includes('video') ||
					name.includes('t2v') ||
					name.includes('i2v') ||
					name.includes('wan')
				);
			});

		case 'music':
		case 'audio':
			return chutes.filter((chute) => {
				const template = chute.standard_template?.toLowerCase() || '';
				const name = chute.name?.toLowerCase() || '';
				const description = chute.description?.toLowerCase() || '';
				
				// Exclude TTS and STT models
				const isTTS = template === 'tts' || template === 'kokoro' || name.includes('tts') || name.includes('kokoro');
				const isSTT = template === 'stt' || template === 'whisper' || name.includes('stt') || name.includes('whisper');
				if (isTTS || isSTT) return false;
				
				return (
					template === 'music' ||
					template === 'audio' ||
					name.includes('music') ||
					name.includes('audio-gen') ||
					description.includes('music generation')
				);
			});

		case 'embeddings':
		case 'embedding':
			return chutes.filter((chute) => {
				const template = chute.standard_template?.toLowerCase() || '';
				const name = chute.name?.toLowerCase() || '';
				const description = chute.description?.toLowerCase() || '';
				
				return (
					template === 'tei' || // Text Embeddings Inference template
					name.includes('embed') ||
					description.includes('embed')
				);
			});

		case 'moderation':
		case 'content-moderation':
			return chutes.filter((chute) => {
				const template = chute.standard_template?.toLowerCase() || '';
				const name = chute.name?.toLowerCase() || '';
				const description = chute.description?.toLowerCase() || '';
				
				return (
					template === 'moderation' ||
					name.includes('moderation') ||
					name.includes('content-moderation') ||
					description.includes('content moderation')
				);
			});

		default:
			return chutes;
	}
}

/**
 * Get chute URL from slug
 */
export function getChuteUrl(slug: string): string {
	if (slug.startsWith('http://') || slug.startsWith('https://')) {
		return slug;
	}
	return `https://${slug}.chutes.ai`;
}

/**
 * Check if a chute is available (not returning 5xx errors)
 */
async function isChuteAvailable(
	chuteUrl: string,
	type: string,
	timeoutMs: number = 10000
): Promise<boolean> {
	if (!hasApiKey()) return false;

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
		timeoutId.unref(); // Don't keep process alive

		// Determine test endpoint based on type
		let endpoint: string;
		let body: Record<string, unknown>;
		
		switch (type) {
			case 'llm':
				endpoint = '/v1/chat/completions';
				body = { 
					model: 'test', 
					messages: [{ role: 'user', content: 'test' }],
					max_tokens: 1
				};
				break;
			case 'image':
				endpoint = '/generate';
				body = { prompt: 'test', width: 64, height: 64 };
				break;
			case 'tts':
			case 'text-to-speech':
				endpoint = '/speak';
				body = { text: 'test' };
				break;
			case 'stt':
			case 'speech-to-text':
				endpoint = '/transcribe';
				body = { audio: 'test' };
				break;
		case 'video':
			endpoint = '/text2video';
			body = { prompt: 'test' };
			break;
		case 'music':
		case 'audio':
			endpoint = '/generate';
			body = { prompt: 'test', duration: 5 };
			break;
		case 'embeddings':
		case 'embedding':
			endpoint = '/v1/embeddings';
			body = { input: 'test', model: null };
			break;
		case 'moderation':
		case 'content-moderation':
			endpoint = '/v1/moderations';
			body = { input: 'test' };
			break;
		default:
				endpoint = '/';
				body = {};
		}

		const response = await fetch(`${chuteUrl}${endpoint}`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${CHUTES_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		// 5xx errors mean the chute isn't available
		if (response.status >= 500) {
			return false;
		}

		// 4xx errors are okay - means the service is running (just bad params)
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Find the first available chute of a specific type
 */
export async function findFirstChuteByType(
	type: string,
	checkAvailability: boolean = true
): Promise<string | null> {
	const allChutes = await discoverChutes();
	const filteredChutes = filterChutesByType(allChutes, type);

	if (filteredChutes.length === 0) {
		console.log(`No ${type} chutes found`);
		return null;
	}

	console.log(`Found ${filteredChutes.length} ${type} chutes`);

	if (!checkAvailability) {
		const url = getChuteUrl(filteredChutes[0].slug);
		console.log(`Using first ${type} chute: ${url}`);
		return url;
	}

	// Check each chute for availability
	for (const chute of filteredChutes) {
		const chuteUrl = getChuteUrl(chute.slug);
		console.log(`Checking ${chute.name} (${chuteUrl})...`);

		const available = await isChuteAvailable(chuteUrl, type);
		if (available) {
			console.log(`✅ Found available ${type} chute: ${chuteUrl}`);
			return chuteUrl;
		} else {
			console.log(`❌ ${chute.name} not available`);
		}
	}

	console.warn(`No available ${type} chutes found`);
	return null;
}

// =============================================================================
// WARMED CHUTE URLs (set by global-warmup.ts before tests run)
// =============================================================================

/**
 * Get the warmed LLM chute URL
 * Set by global-warmup.ts before tests run
 */
export function getLLMChuteUrl(): string | null {
	return process.env.WARMED_LLM_CHUTE || null;
}

/**
 * Get the warmed image chute URL
 */
export function getImageChuteUrl(): string | null {
	return process.env.WARMED_IMAGE_CHUTE || null;
}

/**
 * Get the warmed TTS chute URL
 */
export function getTTSChuteUrl(): string | null {
	return process.env.WARMED_TTS_CHUTE || null;
}

/**
 * Get the warmed STT chute URL
 */
export function getSTTChuteUrl(): string | null {
	return process.env.WARMED_STT_CHUTE || null;
}

/**
 * Get the warmed video chute URL
 */
export function getVideoChuteUrl(): string | null {
	return process.env.WARMED_VIDEO_CHUTE || null;
}

/**
 * Get the warmed music generation chute URL
 */
export function getMusicChuteUrl(): string | null {
	return process.env.WARMED_MUSIC_CHUTE || null;
}

/**
 * Get the warmed embeddings chute URL
 */
export function getEmbeddingsChuteUrl(): string | null {
	return process.env.WARMED_EMBEDDINGS_CHUTE || null;
}

/**
 * Get the warmed moderation chute URL
 */
export function getModerationChuteUrl(): string | null {
	return process.env.WARMED_MODERATION_CHUTE || null;
}

// Legacy exports for backward compatibility
export let LLM_CHUTE_URL: string | null = null;
export let IMAGE_CHUTE_URL: string | null = null;
export let TTS_CHUTE_URL: string | null = null;
export let STT_CHUTE_URL: string | null = null;
export let VIDEO_CHUTE_URL: string | null = null;
export let MUSIC_CHUTE_URL: string | null = null;
export let EMBEDDINGS_CHUTE_URL: string | null = null;
export let MODERATION_CHUTE_URL: string | null = null;

/**
 * Initialize test chutes from warmed environment variables
 * Call this in beforeAll() at the start of integration tests
 * 
 * The chutes are discovered and warmed up by global-warmup.ts before tests run.
 * This function just reads the environment variables set by that global setup.
 */
export async function initializeTestChutes(): Promise<void> {
	if (!hasApiKey()) {
		console.log('⚠️ No API key, integration tests will be skipped');
		return;
	}

	// Read warmed chute URLs from environment (set by global-warmup.ts)
	LLM_CHUTE_URL = getLLMChuteUrl();
	IMAGE_CHUTE_URL = getImageChuteUrl();
	TTS_CHUTE_URL = getTTSChuteUrl();
	STT_CHUTE_URL = getSTTChuteUrl();
	VIDEO_CHUTE_URL = getVideoChuteUrl();
	MUSIC_CHUTE_URL = getMusicChuteUrl();
	EMBEDDINGS_CHUTE_URL = getEmbeddingsChuteUrl();
	MODERATION_CHUTE_URL = getModerationChuteUrl();

	console.log('\n📊 Using warmed chutes (from global setup):');
	console.log(`  LLM:        ${LLM_CHUTE_URL || 'not available'}`);
	console.log(`  Image:      ${IMAGE_CHUTE_URL || 'not available'}`);
	console.log(`  TTS:        ${TTS_CHUTE_URL || 'not available'}`);
	console.log(`  STT:        ${STT_CHUTE_URL || 'not available'}`);
	console.log(`  Video:      ${VIDEO_CHUTE_URL || 'not available'}`);
	console.log(`  Music:      ${MUSIC_CHUTE_URL || 'not available'}`);
	console.log(`  Embeddings: ${EMBEDDINGS_CHUTE_URL || 'not available'}`);
	console.log(`  Moderation: ${MODERATION_CHUTE_URL || 'not available'}`);
	
	// Warn if no chutes were warmed
	const warmedCount = [LLM_CHUTE_URL, IMAGE_CHUTE_URL, TTS_CHUTE_URL, STT_CHUTE_URL, VIDEO_CHUTE_URL, MUSIC_CHUTE_URL, EMBEDDINGS_CHUTE_URL, MODERATION_CHUTE_URL].filter(Boolean).length;
	if (warmedCount === 0) {
		console.log('\n⚠️  No warmed chutes available. Did global-warmup.ts run?');
		console.log('   Check that CHUTES_API_KEY is set and valid.');
	}
}

// Headers helper
export function getAuthHeaders(): Record<string, string> {
	if (!CHUTES_API_KEY) {
		throw new Error('CHUTES_API_KEY is not set');
	}
	return {
		'Authorization': `Bearer ${CHUTES_API_KEY}`,
		'Content-Type': 'application/json',
	};
}

// =============================================================================
// DYNAMIC CHUTE FAILOVER - Handle 429 errors by finding alternative chutes
// =============================================================================

/**
 * Dynamically discover and warm a new chute for a category when hitting capacity issues
 * This is called mid-test when a 429 error occurs
 */
export async function findAlternativeChute(
	category: 'llm' | 'image' | 'video' | 'tts' | 'stt' | 'music' | 'embeddings' | 'moderation',
	excludeUrls: string[] = []
): Promise<string | null> {
	const apiKey = process.env.CHUTES_API_KEY;
	if (!apiKey) {
		console.log(`   ⚠️  No API key - cannot find alternative ${category} chute`);
		return null;
	}

	console.log(`\n🔄 Finding alternative ${category.toUpperCase()} chute (excluding ${excludeUrls.length} failed chute(s))...`);

	try {
		// Import functions from shared modules
		const { filterChutesByType } = await import('../setup/chute-filters');
		const { warmupChuteTypeWithFallback } = await import('../setup/warmup-helpers');
		const { warmUpChute } = await import('../setup/therm');
		
		// Discover all chutes (same logic as global-warmup)
		const url = 'https://api.chutes.ai/chutes/?include_public=true&limit=500';
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			console.log(`   ❌ Failed to discover chutes: ${response.status}`);
			return null;
		}

		const data = await response.json() as { items?: ChuteInfo[] };
		const allChutes = data.items || [];

		// Filter by category
		const categoryChutes = filterChutesByType(allChutes, category);
		
		// Exclude chutes that have already failed
		const availableChutes = categoryChutes.filter((chute: SharedChuteInfo) => {
			const chuteUrl = `https://${chute.slug}.chutes.ai`;
			return !excludeUrls.includes(chuteUrl);
		});

		if (availableChutes.length === 0) {
			console.log(`   ❌ No alternative ${category} chutes available (all ${categoryChutes.length} have been tried)`);
			return null;
		}

		console.log(`   ✓ Found ${availableChutes.length} alternative ${category} chute(s) to try`);

		// Try to warm one of the alternative chutes (try up to 3)
		const result = await warmupChuteTypeWithFallback(
			category,
			availableChutes.slice(0, 3),
			apiKey,
			warmUpChute,
			warmUpChute,
			{ maxPolls: 3, pollIntervalMs: 10000 }
		);

		if (result && result.isHot) {
			console.log(`   ✅ Successfully warmed alternative ${category} chute: ${result.name}`);
			return result.url;
		}

		console.log(`   ❌ Failed to warm any alternative ${category} chutes`);
		return null;

	} catch (error) {
		console.error(`   ❌ Error finding alternative chute:`, error);
		return null;
	}
}

// Retry helper for flaky API calls with 429 failover support
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: {
		maxRetries?: number;
		delayMs?: number;
		category?: 'llm' | 'image' | 'video' | 'tts' | 'stt' | 'music' | 'embeddings' | 'moderation';
		currentChuteUrl?: string;
	} = {}
): Promise<T> {
	const { maxRetries = 3, delayMs = 1000, category, currentChuteUrl } = options;
	let lastError: Error | undefined;
	const failedChutes: string[] = currentChuteUrl ? [currentChuteUrl] : [];
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			const errorMsg = lastError.message;
			
			// Check if this is a 429 error (capacity issue)
			const is429Error = errorMsg.includes('429') || 
			                    errorMsg.includes('maximum capacity') ||
			                    errorMsg.includes('Infrastructure is at maximum capacity');
			
			if (is429Error && category) {
				console.log(`\n⚠️  Attempt ${attempt}/${maxRetries} failed with 429 error - trying alternative ${category} chute...`);
				
				// Try to find an alternative chute
				const alternativeChute = await findAlternativeChute(category, failedChutes);
				
				if (alternativeChute) {
					// Update environment variable for this category
					const envVar = `WARMED_${category.toUpperCase()}_CHUTE`;
					process.env[envVar] = alternativeChute;
					failedChutes.push(alternativeChute); // Track in case this one also fails
					
					console.log(`   ✓ Switched to alternative chute: ${alternativeChute}`);
					console.log(`   🔄 Retrying operation with new chute...`);
					
					// Retry immediately with new chute (don't wait)
					continue;
				} else {
					console.log(`   ❌ No alternative ${category} chutes available`);
					// If this is our last retry and we have no alternatives, throw skip-worthy error
					if (attempt === maxRetries) {
						throw new Error(`ALL_CHUTES_EXHAUSTED: All ${category} chutes are at capacity or unavailable (429 errors)`);
					}
					console.log(`   ⏳ Will retry with exponential backoff...`);
				}
			} else {
				console.log(`   ⚠️  Attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);
			}
			
			// Wait before retrying (exponential backoff)
			if (attempt < maxRetries) {
				const waitTime = delayMs * attempt;
				console.log(`   ⏳ Waiting ${waitTime}ms before retry...`);
				await new Promise(resolve => {
					const timer = setTimeout(resolve, waitTime);
					timer.unref(); // Don't keep process alive if test times out
				});
			}
		}
	}
	
	throw lastError;
}

// Wait for a condition with timeout
export async function waitFor(
	condition: () => Promise<boolean> | boolean,
	timeoutMs: number = 30000,
	intervalMs: number = 1000
): Promise<boolean> {
	const startTime = Date.now();
	
	while (Date.now() - startTime < timeoutMs) {
		if (await condition()) {
			return true;
		}
		await new Promise(resolve => {
			const timer = setTimeout(resolve, intervalMs);
			timer.unref(); // Don't keep process alive
		});
	}
	
	return false;
}

// Create a mock n8n context for integration testing
export function createIntegrationContext(credentials: { apiKey: string }) {
	return {
		getCredentials: jest.fn().mockResolvedValue(credentials),
		getNodeParameter: jest.fn(),
		helpers: {
			request: async (options: Record<string, unknown>) => {
				const response = await fetch(options.url as string, {
					method: (options.method as string) || 'POST',
					headers: {
						...(options.headers as Record<string, string>),
						'Authorization': `Bearer ${credentials.apiKey}`,
					},
					body: options.body ? JSON.stringify(options.body) : undefined,
				});
				
				if (!response.ok) {
					const error = await response.text();
					throw new Error(`API error ${response.status}: ${error}`);
				}
				
				const contentType = response.headers.get('content-type');
				if (contentType?.includes('application/json')) {
					return response.json();
				}
				
				return response.arrayBuffer();
			},
		},
	};
}

// Log test result summary
export function logTestSummary(testName: string, passed: boolean, details?: string) {
	const status = passed ? '✅ PASS' : '❌ FAIL';
	console.log(`\n${status}: ${testName}`);
	if (details) {
		console.log(`  Details: ${details}`);
	}
}

// Generate a unique test ID for tracking
export function generateTestId(): string {
	return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
