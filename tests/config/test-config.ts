/**
 * Test Configuration
 * Loads environment variables for testing with real API
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface TestConfig {
	apiKey: string;
	environment: string;
	customUrl?: string;
	skipRealApiTests: boolean;
}

/**
 * Get test configuration from environment variables
 */
export function getTestConfig(): TestConfig {
	const apiKey = process.env.CHUTES_API_KEY || '';
	const environment = process.env.CHUTES_ENVIRONMENT || 'production';
	const customUrl = process.env.CHUTES_CUSTOM_URL || undefined;

	// If no API key is set, skip real API tests
	const skipRealApiTests = !apiKey || apiKey === 'PUT_YOUR_ACTUAL_API_KEY_HERE';

	if (skipRealApiTests) {
		console.warn(
			'\n⚠️  CHUTES_API_KEY not configured in .env file.\n' +
				'   Real API tests will be skipped.\n' +
				'   To enable them, add your API key to the .env file.\n',
		);
	}

	return {
		apiKey,
		environment,
		customUrl,
		skipRealApiTests,
	};
}

/**
 * Validate that test config is ready for real API tests
 */
export function requireRealApiConfig(): TestConfig {
	const config = getTestConfig();

	if (config.skipRealApiTests) {
		throw new Error(
			'Real API tests require CHUTES_API_KEY in .env file. ' +
				'Copy .env.example to .env and add your API key.',
		);
	}

	return config;
}

