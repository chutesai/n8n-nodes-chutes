/**
 * Global Test Warmup Setup for n8n-nodes-chutes
 * 
 * This file runs once before all tests to:
 * 1. Discover the chutes that integration tests will use
 * 2. Warm them up so they're ready for immediate use (with retry and fallback logic)
 * 3. Share the chute URLs with test files via environment variables
 * 
 * This eliminates the need for hardcoded chute URLs and reduces test flakiness
 * caused by cold chutes.
 * 
 * NEW: Uses warmup-helpers.ts for polling and fallback logic
 * - Actively polls to wait for chutes to become hot
 * - Tries alternative chutes of the same type if first one fails
 * - Only sets env vars for chutes that are actually hot
 * 
 * Based on ai-sdk-provider-chutes global-warmup.ts
 */

import 'dotenv/config';
import { warmUpChute } from './therm';
import { warmupChuteTypeWithFallback } from './warmup-helpers';
import { filterChutesByType, type ChuteInfo } from './chute-filters';

// Log discovered chute for debugging
function logChuteDetails(chutes: ChuteInfo[], type: string): void {
	console.log(`\n   📋 ${type.toUpperCase()} chutes found (${chutes.length}):`);
	chutes.slice(0, 3).forEach((c, i) => {
		console.log(`      ${i + 1}. ${c.name} (template: ${c.standard_template || 'none'})`);
	});
	if (chutes.length > 3) {
		console.log(`      ... and ${chutes.length - 3} more`);
	}
}

interface ChutesAPIResponse {
	total: number;
	items: ChuteInfo[];
}

interface TestChuteInfo {
	chuteId: string;
	url: string;
	name: string;
	isHot?: boolean;
}

interface DiscoveredChutes {
	llm: ChuteInfo[];
	image: ChuteInfo[];
	tts: ChuteInfo[];
	stt: ChuteInfo[];
	video: ChuteInfo[];
	music: ChuteInfo[];
	embeddings: ChuteInfo[];
	moderation: ChuteInfo[];
}

interface TestChuteConfig {
	llm?: TestChuteInfo;
	image?: TestChuteInfo;
	tts?: TestChuteInfo;
	stt?: TestChuteInfo;
	video?: TestChuteInfo;
	music?: TestChuteInfo;
	embeddings?: TestChuteInfo;
	moderation?: TestChuteInfo;
}

/**
 * Discover all available chutes from the API
 */
async function discoverChutes(apiKey: string): Promise<ChuteInfo[]> {
	const url = 'https://api.chutes.ai/chutes/?include_public=true&limit=500';
	
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to discover chutes: ${response.status}`);
	}

	const data = await response.json() as ChutesAPIResponse;
	return data.items || [];
}

// filterChutesByType function moved to chute-filters.ts for reusability

/**
 * Discover all available chutes for each type (not just the first one)
 * This allows us to try fallbacks if the first chute fails to warm up
 */
async function discoverAllChutes(apiKey: string): Promise<DiscoveredChutes> {
	console.log('🔍 Discovering chutes for integration tests...');
	
	const allChutes = await discoverChutes(apiKey);

	// Discover LLM chutes
	const llmChutes = filterChutesByType(allChutes, 'llm');
	logChuteDetails(llmChutes, 'LLM');
	if (llmChutes.length > 0) {
		console.log(`   ✓ LLM: ${llmChutes.length} chutes available`);
	} else {
		console.log('   ⚠ No LLM chutes found');
	}

	// Discover image chutes
	const imageChutes = filterChutesByType(allChutes, 'image');
	logChuteDetails(imageChutes, 'IMAGE');
	if (imageChutes.length > 0) {
		console.log(`   ✓ IMAGE: ${imageChutes.length} chutes available`);
	} else {
		console.log('   ⚠ No IMAGE chutes found');
	}

	// Discover TTS chutes
	const ttsChutes = filterChutesByType(allChutes, 'tts');
	logChuteDetails(ttsChutes, 'TTS');
	if (ttsChutes.length > 0) {
		console.log(`   ✓ TTS: ${ttsChutes.length} chutes available`);
	} else {
		console.log('   ⚠ No TTS chutes found');
	}

	// Discover STT chutes
	const sttChutes = filterChutesByType(allChutes, 'stt');
	logChuteDetails(sttChutes, 'STT');
	if (sttChutes.length > 0) {
		console.log(`   ✓ STT: ${sttChutes.length} chutes available`);
	} else {
		console.log('   ⚠ No STT chutes found');
	}

	// Discover video chutes
	const videoChutes = filterChutesByType(allChutes, 'video');
	logChuteDetails(videoChutes, 'VIDEO');
	if (videoChutes.length > 0) {
		console.log(`   ✓ VIDEO: ${videoChutes.length} chutes available`);
	} else {
		console.log('   ⚠ No VIDEO chutes found');
	}

	// Discover music chutes
	const musicChutes = filterChutesByType(allChutes, 'music');
	logChuteDetails(musicChutes, 'MUSIC');
	if (musicChutes.length > 0) {
		console.log(`   ✓ MUSIC: ${musicChutes.length} chutes available`);
	} else {
		console.log('   ⚠ No MUSIC chutes found');
	}

	// Discover embeddings chutes
	const embeddingsChutes = filterChutesByType(allChutes, 'embeddings');
	logChuteDetails(embeddingsChutes, 'EMBEDDINGS');
	if (embeddingsChutes.length > 0) {
		console.log(`   ✓ EMBEDDINGS: ${embeddingsChutes.length} chutes available`);
	} else {
		console.log('   ⚠ No EMBEDDINGS chutes found');
	}

	// Discover moderation chutes
	const moderationChutes = filterChutesByType(allChutes, 'moderation');
	logChuteDetails(moderationChutes, 'MODERATION');
	if (moderationChutes.length > 0) {
		console.log(`   ✓ MODERATION: ${moderationChutes.length} chutes available`);
	} else {
		console.log('   ⚠ No MODERATION chutes found');
	}

	return {
		llm: llmChutes,
		image: imageChutes,
		tts: ttsChutes,
		stt: sttChutes,
		video: videoChutes,
		music: musicChutes,
		embeddings: embeddingsChutes,
		moderation: moderationChutes,
	};
}

/**
 * Warm up all discovered test chutes with retry and fallback logic
 * 
 * NEW APPROACH:
 * - For each chute type, try to warm up chutes with polling
 * - If first chute doesn't become hot, try the next one (fallback)
 * - Only return chutes that are actually hot and working
 */
async function warmupTestChutesWithFallback(discovered: DiscoveredChutes, apiKey: string): Promise<TestChuteConfig> {
	console.log('\n🔥 Warming up test chutes with retry and fallback...');

	const config: TestChuteConfig = {};

	// Warmup configuration
	const warmupOptions = {
		maxPolls: 3,           // Try up to 3 status checks (3 × 10s = 30s max per chute)
		pollIntervalMs: 10000, // Wait 10 seconds between checks
	};

	// Try to warm up each chute type with fallback logic
	const llmResult = await warmupChuteTypeWithFallback(
		'llm',
		discovered.llm,
		apiKey,
		warmUpChute,
		warmUpChute,
		warmupOptions
	);
	if (llmResult) config.llm = llmResult;

	const imageResult = await warmupChuteTypeWithFallback(
		'image',
		discovered.image,
		apiKey,
		warmUpChute,
		warmUpChute,
		warmupOptions
	);
	if (imageResult) config.image = imageResult;

	const ttsResult = await warmupChuteTypeWithFallback(
		'tts',
		discovered.tts,
		apiKey,
		warmUpChute,
		warmUpChute,
		warmupOptions
	);
	if (ttsResult) config.tts = ttsResult;

	const sttResult = await warmupChuteTypeWithFallback(
		'stt',
		discovered.stt,
		apiKey,
		warmUpChute,
		warmUpChute,
		warmupOptions
	);
	if (sttResult) config.stt = sttResult;

	const videoResult = await warmupChuteTypeWithFallback(
		'video',
		discovered.video,
		apiKey,
		warmUpChute,
		warmUpChute,
		warmupOptions
	);
	if (videoResult) config.video = videoResult;

	// TEMPORARILY SKIP: Music chute warmup is hanging (timeout issue)
	// Music tests will gracefully skip when no warmed chute is available
	// const musicResult = await warmupChuteTypeWithFallback(
	// 	'music',
	// 	discovered.music,
	// 	apiKey,
	// 	warmUpChute,
	// 	warmUpChute,
	// 	warmupOptions
	// );
	// if (musicResult) config.music = musicResult;
	console.log('   ⏭️  Skipping MUSIC warmup (timeout issue - tests will skip gracefully)');

	const embeddingsResult = await warmupChuteTypeWithFallback(
		'embeddings',
		discovered.embeddings,
		apiKey,
		warmUpChute,
		warmUpChute,
		warmupOptions
	);
	if (embeddingsResult) config.embeddings = embeddingsResult;

	const moderationResult = await warmupChuteTypeWithFallback(
		'moderation',
		discovered.moderation,
		apiKey,
		warmUpChute,
		warmUpChute,
		warmupOptions
	);
	if (moderationResult) config.moderation = moderationResult;

	return config;
}

/**
 * Jest Global Setup
 */
module.exports = async function globalSetup() {
	const apiKey = process.env.CHUTES_API_KEY;
	
	if (!apiKey) {
		console.log('\n⏭️  No CHUTES_API_KEY - skipping global warmup');
		console.log('   Integration tests will be skipped.\n');
		return;
	}

	console.log('\n' + '='.repeat(60));
	console.log('🔥 GLOBAL TEST WARMUP - n8n-nodes-chutes');
	console.log('='.repeat(60));

	try {
		// Step 1: Discover ALL chutes (not just the first one per type)
		const discovered = await discoverAllChutes(apiKey);
		
		// Step 2: Warm them up with retry and fallback logic
		const config = await warmupTestChutesWithFallback(discovered, apiKey);
	
	// Step 3: Store URLs in environment variables for tests to use
	// CRITICAL: Only set env vars for chutes that are actually hot and working!
	// This prevents tests from trying to use broken/unavailable chutes
	if (config.llm?.url && config.llm?.isHot) {
		process.env.WARMED_LLM_CHUTE = config.llm.url;
		process.env.WARMED_LLM_CHUTE_ID = config.llm.chuteId;
	}
	if (config.image?.url && config.image?.isHot) {
		process.env.WARMED_IMAGE_CHUTE = config.image.url;
		process.env.WARMED_IMAGE_CHUTE_ID = config.image.chuteId;
	}
	if (config.tts?.url && config.tts?.isHot) {
		process.env.WARMED_TTS_CHUTE = config.tts.url;
		process.env.WARMED_TTS_CHUTE_ID = config.tts.chuteId;
	}
	if (config.stt?.url && config.stt?.isHot) {
		process.env.WARMED_STT_CHUTE = config.stt.url;
		process.env.WARMED_STT_CHUTE_ID = config.stt.chuteId;
	}
	if (config.video?.url && config.video?.isHot) {
		process.env.WARMED_VIDEO_CHUTE = config.video.url;
		process.env.WARMED_VIDEO_CHUTE_ID = config.video.chuteId;
		process.env.WARMED_VIDEO_CHUTE_NAME = config.video.name; // For capability checking (T2V vs I2V)
	}
	if (config.music?.url && config.music?.isHot) {
		process.env.WARMED_MUSIC_CHUTE = config.music.url;
		process.env.WARMED_MUSIC_CHUTE_ID = config.music.chuteId;
	}
	if (config.embeddings?.url && config.embeddings?.isHot) {
		process.env.WARMED_EMBEDDINGS_CHUTE = config.embeddings.url;
		process.env.WARMED_EMBEDDINGS_CHUTE_ID = config.embeddings.chuteId;
	}
	if (config.moderation?.url && config.moderation?.isHot) {
		process.env.WARMED_MODERATION_CHUTE = config.moderation.url;
		process.env.WARMED_MODERATION_CHUTE_ID = config.moderation.chuteId;
	}

	// Summary - only count chutes that are actually hot and available
	const hotChuteCount = Object.values(config).filter(c => c?.isHot).length;
	const discoveredCount = Object.values(config).filter(Boolean).length;
		console.log('\n' + '='.repeat(60));
		console.log(`✅ Warmup complete: ${hotChuteCount} hot chute(s) ready (${discoveredCount} discovered)`);
		console.log('='.repeat(60) + '\n');

	} catch (error) {
		console.error('\n❌ Global warmup failed:', error);
		console.log('   Tests will continue but may experience cold start delays.\n');
	}
};

