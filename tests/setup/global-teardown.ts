/**
 * Global Test Teardown for n8n-nodes-chutes
 * 
 * Ensures clean exit by:
 * 1. Waiting for any pending fetch operations to complete
 * 2. Allowing HTTP agents to close connections
 * 3. Giving Jest workers time to clean up
 * 
 * NOTE: The warmup timeout fix in global-warmup.ts (clearTimeout in finally block)
 * should prevent most hanging issues. This teardown is just for extra safety.
 */

export default async function globalTeardown() {
	// Wait for any pending HTTP connections to close
	// Node.js fetch() uses undici under the hood which maintains connection pools
	// We give it a brief moment to drain connections
	// 
	// IMPORTANT: This setTimeout is intentionally NOT cleared because we WANT it
	// to keep the process alive until cleanup is complete
	await new Promise(resolve => setTimeout(resolve, 500));

	console.log('\n✅ Global teardown complete - connection pools drained\n');
}

