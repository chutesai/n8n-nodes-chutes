/**
 * Warmup Helpers with Retry and Fallback Logic
 * 
 * Provides functions to:
 * 1. Warm up a chute and poll until it's hot
 * 2. Try multiple chutes of the same type as fallbacks
 * 3. Only return chutes that are actually hot and working
 */

import { warmUpChute, WarmupResult } from './therm';

interface ChuteInfo {
	chute_id: string;
	slug: string;
	name: string;
}

interface WarmupConfig {
	chuteId: string;
	url: string;
	name: string;
	isHot: boolean;
}

interface RetryOptions {
	maxPolls: number;
	pollIntervalMs: number;
}

/**
 * Type definitions for dependency injection (testing)
 */
type WarmupFunction = (chuteId: string, apiKey: string) => Promise<WarmupResult>;
type CheckStatusFunction = (chuteId: string, apiKey: string) => Promise<WarmupResult>;

/**
 * Wait for a specified time
 */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call an async function with a timeout
 * Properly cleans up the timeout to prevent Jest hanging
 */
async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	errorMessage: string
): Promise<T> {
	let timeoutId: NodeJS.Timeout | undefined;
	
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
	});
	
	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		// CRITICAL: Always clear the timeout to prevent hanging
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
	}
}

/**
 * Get chute URL from slug
 */
function getChuteUrl(slug: string): string {
	return `https://${slug}.chutes.ai`;
}

/**
 * Warm up a single chute and poll until it's hot
 * 
 * @param chute - Chute information
 * @param apiKey - API key for warmup calls
 * @param warmupFn - Function to call warmup API (injectable for testing)
 * @param checkStatusFn - Function to check chute status (injectable for testing)
 * @param options - Retry configuration
 * @returns WarmupConfig if successful, null if chute never becomes hot
 */
export async function warmupChuteWithRetry(
	chute: ChuteInfo,
	apiKey: string,
	warmupFn: WarmupFunction = warmUpChute,
	checkStatusFn: CheckStatusFunction = warmUpChute,
	options: RetryOptions = { maxPolls: 5, pollIntervalMs: 2000 }
): Promise<WarmupConfig | null> {
	try {
		// Step 1: Trigger warmup and check status immediately (with 30s timeout)
		console.log(`   🔄 Warming ${chute.name}...`);
		const initialStatus = await withTimeout(
			warmupFn(chute.chute_id, apiKey),
			30000,
			'Warmup timeout'
		);

		// Check if it's hot immediately (most chutes are!)
		if (initialStatus.isHot) {
			console.log(`   ✅ ${chute.name}: Hot! ${initialStatus.instanceCount} instance(s)`);
			return {
				chuteId: chute.chute_id,
				url: getChuteUrl(chute.slug),
				name: chute.name,
				isHot: true,
			};
		}

		// Step 2: If not hot yet, poll for hot status
		console.log(`   ⏳ ${chute.name}: Not hot yet (${initialStatus.status}), polling...`);
		for (let i = 0; i < options.maxPolls; i++) {
			// Wait before checking (give chute time to warm)
			await sleep(options.pollIntervalMs);

			// Check status (with timeout)
			const status = await withTimeout(
				checkStatusFn(chute.chute_id, apiKey),
				30000,
				'Status check timeout'
			);
			
			if (status.isHot) {
				console.log(`   ✅ ${chute.name}: Hot! ${status.instanceCount} instance(s)`);
				return {
					chuteId: chute.chute_id,
					url: getChuteUrl(chute.slug),
					name: chute.name,
					isHot: true,
				};
			}

			console.log(`   ⏳ ${chute.name}: Poll ${i + 1}/${options.maxPolls} - status: ${status.status}`);
		}

		// Chute never became hot
		console.log(`   ❌ ${chute.name}: Failed to warm up after ${options.maxPolls} polls`);
		return null;

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.log(`   ❌ ${chute.name}: Warmup error - ${errorMessage}`);
		return null;
	}
}

/**
 * Try to warm up chutes of a specific type, with fallback to alternatives
 * 
 * This is the core logic for "try to make it hot, wait, and then try a different
 * chute of the same type if available"
 * 
 * @param type - Chute type (e.g., 'llm', 'tts', 'embeddings')
 * @param chutes - List of chutes to try (in priority order)
 * @param apiKey - API key for warmup calls
 * @param warmupFn - Function to call warmup API (injectable for testing)
 * @param checkStatusFn - Function to check chute status (injectable for testing)
 * @param options - Retry configuration
 * @returns WarmupConfig if any chute becomes hot, null if all fail
 */
export async function warmupChuteTypeWithFallback(
	type: string,
	chutes: ChuteInfo[],
	apiKey: string,
	warmupFn: WarmupFunction = warmUpChute,
	checkStatusFn: CheckStatusFunction = warmUpChute,
	options: RetryOptions = { maxPolls: 5, pollIntervalMs: 2000 }
): Promise<WarmupConfig | null> {
	if (!chutes || chutes.length === 0) {
		console.log(`   ⚠️  No ${type.toUpperCase()} chutes available to warm up`);
		return null;
	}

	// IMPORTANT: Only try the first 3 chutes max, not all 471 LLMs!
	const chutesToTry = chutes.slice(0, 3);
	console.log(`   🔥 Warming ${type.toUpperCase()} chutes (trying ${chutesToTry.length} of ${chutes.length} available)...`);

	// Try each chute in order until one becomes hot
	for (let i = 0; i < chutesToTry.length; i++) {
		const chute = chutesToTry[i];
		console.log(`   🎯 Trying ${type.toUpperCase()} chute ${i + 1}/${chutesToTry.length}: ${chute.name}`);

		const result = await warmupChuteWithRetry(
			chute,
			apiKey,
			warmupFn,
			checkStatusFn,
			options
		);

		if (result && result.isHot) {
			// Success! This chute is hot
			console.log(`   🎉 ${type.toUpperCase()}: Successfully warmed ${chute.name}`);
			return result;
		}

		// This chute failed, try next one if available
		if (i < chutesToTry.length - 1) {
			console.log(`   ⏭️  ${type.toUpperCase()}: Trying next chute...`);
		}
	}

	// All attempted chutes failed to warm up
	console.log(`   ❌ ${type.toUpperCase()}: All ${chutesToTry.length} attempted chutes failed to warm up`);
	return null;
}

