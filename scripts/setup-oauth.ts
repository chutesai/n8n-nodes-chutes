import * as fs from 'fs';
import * as crypto from 'crypto';

export const CHUTES_API_URL = 'https://api.chutes.ai';

export async function verifyApiKey(apiKey: string): Promise<boolean> {
	try {
		const response = await fetch(`${CHUTES_API_URL}/users/me`, {
			headers: { Authorization: `Bearer ${apiKey}` },
		});
		return response.ok;
	} catch {
		return false;
	}
}

export async function registerOAuthApp(params: {
	apiKey: string;
	name: string;
	redirectUris: string[];
	scopes: string[];
}): Promise<{ client_id: string; client_secret: string; app_id: string }> {
	const response = await fetch(`${CHUTES_API_URL}/idp/apps`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${params.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			name: params.name,
			description: 'OAuth app for n8n Chutes integration',
			redirect_uris: params.redirectUris,
			allowed_scopes: params.scopes,
		}),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			(error as Record<string, string>).detail ||
				(error as Record<string, string>).message ||
				`HTTP ${response.status}`,
		);
	}

	return response.json() as Promise<{ client_id: string; client_secret: string; app_id: string }>;
}

export async function generatePKCE(): Promise<{
	codeVerifier: string;
	codeChallenge: string;
}> {
	const randomBytes = crypto.randomBytes(32);
	const codeVerifier = randomBytes
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

	const hash = crypto.createHash('sha256').update(codeVerifier).digest();
	const codeChallenge = hash
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

	return { codeVerifier, codeChallenge };
}

export function writeEnvFile(
	filePath: string,
	vars: Record<string, string>,
): { written: string[]; skipped: string[] } {
	const written: string[] = [];
	const skipped: string[] = [];

	const keys = Object.keys(vars);
	if (keys.length === 0) {
		return { written, skipped };
	}

	let existing = '';
	if (fs.existsSync(filePath)) {
		existing = fs.readFileSync(filePath, 'utf-8');
	}

	const linesToAppend: string[] = [];
	for (const key of keys) {
		const pattern = new RegExp(`^${key}=`, 'm');
		if (pattern.test(existing)) {
			skipped.push(key);
		} else {
			linesToAppend.push(`${key}=${vars[key]}`);
			written.push(key);
		}
	}

	if (linesToAppend.length > 0) {
		const needsNewline = existing.length > 0 && !existing.endsWith('\n');
		const prefix = needsNewline ? '\n' : '';
		fs.appendFileSync(filePath, prefix + linesToAppend.join('\n') + '\n');
	}

	return { written, skipped };
}

export function readExistingOAuthCredentials(
	filePath: string,
): { clientId: string; clientSecret: string } | null {
	if (!fs.existsSync(filePath)) {
		return null;
	}

	const content = fs.readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');

	let clientId = '';
	let clientSecret = '';

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('#')) continue;

		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;

		const key = trimmed.substring(0, eqIdx).trim();
		const value = trimmed.substring(eqIdx + 1).trim();

		if (key === 'CHUTES_OAUTH_CLIENT_ID') clientId = value;
		if (key === 'CHUTES_OAUTH_CLIENT_SECRET') clientSecret = value;
	}

	if (!clientId || !clientSecret) {
		return null;
	}

	return { clientId, clientSecret };
}

export function formatEnvOutput(vars: Record<string, string>): string {
	return Object.entries(vars)
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');
}

export const DEFAULT_REDIRECT_URI = 'http://localhost:5678/rest/oauth2-credential/callback';
export const DEFAULT_SCOPES = ['openid', 'profile', 'chutes:invoke'];

export function buildAuthorizationUrl(params: {
	clientId: string;
	redirectUri: string;
	scopes: string[];
	state: string;
	codeChallenge: string;
}): string {
	const url = new URL(`${CHUTES_API_URL}/idp/authorize`);
	url.searchParams.set('client_id', params.clientId);
	url.searchParams.set('redirect_uri', params.redirectUri);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', params.scopes.join(' '));
	url.searchParams.set('state', params.state);
	url.searchParams.set('code_challenge', params.codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	return url.toString();
}

export async function exchangeCodeForTokens(params: {
	clientId: string;
	clientSecret: string;
	code: string;
	redirectUri: string;
	codeVerifier: string;
}): Promise<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }> {
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		client_id: params.clientId,
		client_secret: params.clientSecret,
		code: params.code,
		redirect_uri: params.redirectUri,
		code_verifier: params.codeVerifier,
	});

	const response = await fetch(`${CHUTES_API_URL}/idp/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(
			(error as Record<string, string>).error_description ||
				(error as Record<string, string>).detail ||
				`HTTP ${response.status}`,
		);
	}

	return response.json() as Promise<{
		access_token: string;
		refresh_token: string;
		token_type: string;
		expires_in: number;
	}>;
}

interface SetupOptions {
	apiKey: string;
	mode: 'multi-user' | 'single-account';
	redirectUri: string;
	envFilePath: string;
	writeToFile: boolean;
	authCode?: string;
	codeVerifier?: string;
}

interface SetupResult {
	clientId: string;
	clientSecret: string;
	appId: string;
	accessToken?: string;
	refreshToken?: string;
}

export async function runSetup(options: SetupOptions): Promise<SetupResult> {
	const isValid = await verifyApiKey(options.apiKey);
	if (!isValid) {
		throw new Error('Invalid API key. Please check and try again.');
	}

	const app = await registerOAuthApp({
		apiKey: options.apiKey,
		name: 'n8n Chutes Integration',
		redirectUris: [options.redirectUri],
		scopes: DEFAULT_SCOPES,
	});

	const envVars: Record<string, string> = {
		CHUTES_OAUTH_CLIENT_ID: app.client_id,
		CHUTES_OAUTH_CLIENT_SECRET: app.client_secret,
	};

	let accessToken: string | undefined;
	let refreshToken: string | undefined;

	if (options.mode === 'single-account') {
		if (!options.authCode || !options.codeVerifier) {
			throw new Error('authCode and codeVerifier are required for single-account mode');
		}

		const tokens = await exchangeCodeForTokens({
			clientId: app.client_id,
			clientSecret: app.client_secret,
			code: options.authCode,
			redirectUri: options.redirectUri,
			codeVerifier: options.codeVerifier,
		});

		accessToken = tokens.access_token;
		refreshToken = tokens.refresh_token;
		envVars.CHUTES_SERVER_ACCESS_TOKEN = tokens.access_token;
		envVars.CHUTES_SERVER_REFRESH_TOKEN = tokens.refresh_token;
	}

	if (options.writeToFile) {
		writeEnvFile(options.envFilePath, envVars);
	}

	return {
		clientId: app.client_id,
		clientSecret: app.client_secret,
		appId: app.app_id,
		accessToken,
		refreshToken,
	};
}

interface UpgradeOptions {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	authCode: string;
	codeVerifier: string;
	envFilePath: string;
	writeToFile: boolean;
}

interface UpgradeResult {
	accessToken: string;
	refreshToken: string;
}

export async function runUpgradeToSingleAccount(options: UpgradeOptions): Promise<UpgradeResult> {
	const tokens = await exchangeCodeForTokens({
		clientId: options.clientId,
		clientSecret: options.clientSecret,
		code: options.authCode,
		redirectUri: options.redirectUri,
		codeVerifier: options.codeVerifier,
	});

	if (options.writeToFile) {
		writeEnvFile(options.envFilePath, {
			CHUTES_SERVER_ACCESS_TOKEN: tokens.access_token,
			CHUTES_SERVER_REFRESH_TOKEN: tokens.refresh_token,
		});
	}

	return {
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
	};
}

export async function main(): Promise<void> {
	const readline = await import('readline');
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

	const ask = (question: string): Promise<string> =>
		new Promise((resolve) => rl.question(question, (a: string) => resolve(a.trim())));

	console.log('\n╔════════════════════════════════════════════════════════════╗');
	console.log('║      n8n-nodes-chutes — OAuth Setup Wizard                ║');
	console.log('╚════════════════════════════════════════════════════════════╝\n');

	const existingCreds = readExistingOAuthCredentials('.env');
	if (existingCreds) {
		console.log('Existing OAuth app detected in .env:');
		console.log(`  Client ID: ${existingCreds.clientId.substring(0, 8)}...`);
		console.log('');
		console.log('Would you like to upgrade to single-account mode?');
		console.log('(Your account will pay for all inference used by all users)\n');

		const upgradeChoice = await ask('Upgrade to single-account? [y/N]: ');
		if (upgradeChoice.toLowerCase() === 'y') {
			const redirectUri =
				(await ask(
					`Redirect URI (Example: https://<n8n-host>/rest/oauth2-credential/callback)\n` +
						`Press Enter for default [${DEFAULT_REDIRECT_URI}]: `,
				)) || DEFAULT_REDIRECT_URI;

			const pkce = await generatePKCE();
			const state = crypto.randomBytes(16).toString('hex');
			const authUrl = buildAuthorizationUrl({
				clientId: existingCreds.clientId,
				redirectUri,
				scopes: DEFAULT_SCOPES,
				state,
				codeChallenge: pkce.codeChallenge,
			});

			console.log('\nOpen this URL in your browser to authorize:\n');
			console.log(authUrl);
			console.log('\nAfter authorizing, copy the "code" parameter from the callback URL.\n');

			const authCode = await ask('Enter the authorization code: ');
			if (!authCode) {
				console.error('Authorization code is required.');
				rl.close();
				process.exit(1);
			}

			try {
				const result = await runUpgradeToSingleAccount({
					clientId: existingCreds.clientId,
					clientSecret: existingCreds.clientSecret,
					redirectUri,
					authCode,
					codeVerifier: pkce.codeVerifier,
					envFilePath: '.env',
					writeToFile: false,
				});

				const envVars: Record<string, string> = {
					CHUTES_SERVER_ACCESS_TOKEN: result.accessToken,
					CHUTES_SERVER_REFRESH_TOKEN: result.refreshToken,
				};

				console.log('\nUpgrade complete!\n');

				const writeChoice = await ask('Write tokens to .env file? [Y/n]: ');
				if (writeChoice.toLowerCase() !== 'n') {
					let filePath = '.env';
					const customPath = await ask('File path (default: .env): ');
					if (customPath) {
						filePath = customPath;
					}

					const writeResult = writeEnvFile(filePath, envVars);
					if (writeResult.written.length > 0) {
						console.log(`\nWritten to ${filePath}:`);
						for (const key of writeResult.written) {
							console.log(`  ${key}`);
						}
					}
					if (writeResult.skipped.length > 0) {
						console.log(`\nSkipped (already exist in ${filePath}):`);
						for (const key of writeResult.skipped) {
							console.log(`  ${key}`);
						}
					}
				} else {
					console.log('\nAdd these to your environment:\n');
					console.log(formatEnvOutput(envVars));
				}

				console.log('\nDone! Restart n8n for the changes to take effect.\n');
			} catch (err) {
				console.error(`\nUpgrade failed: ${err instanceof Error ? err.message : String(err)}`);
				rl.close();
				process.exit(1);
			}

			rl.close();
			return;
		}

		console.log('\nProceeding with fresh setup...\n');
	}

	console.log('You need a Chutes API key to register an OAuth app.');
	console.log('Get one at: https://chutes.ai/app/api\n');

	const apiKey = await ask('Enter your Chutes API key: ');
	if (!apiKey) {
		console.error('API key is required.');
		rl.close();
		process.exit(1);
	}

	console.log('\nVerifying API key...');
	const valid = await verifyApiKey(apiKey);
	if (!valid) {
		console.error('Invalid API key. Please check and try again.');
		rl.close();
		process.exit(1);
	}
	console.log('API key verified.\n');

	console.log('How would you like to set up Chutes authentication?\n');
	console.log('  1) Sign in With Chutes — let each user connect their own Chutes account');
	console.log('  2) Single account (Advanced) — your account pays for all inference\n');

	const modeChoice = await ask('Choose [1/2] (default: 1): ');
	const mode: 'multi-user' | 'single-account' = modeChoice === '2' ? 'single-account' : 'multi-user';

	const redirectUri =
		(await ask(
			`Redirect URI (Example: https://<n8n-host>/rest/oauth2-credential/callback)\n` +
				`Press Enter for default [${DEFAULT_REDIRECT_URI}]: `,
		)) || DEFAULT_REDIRECT_URI;

	console.log('\nRegistering OAuth application...');

	try {
		const result = await runSetup({
			apiKey,
			mode: 'multi-user',
			redirectUri,
			envFilePath: '.env',
			writeToFile: false,
		});

		const envVars: Record<string, string> = {
			CHUTES_OAUTH_CLIENT_ID: result.clientId,
			CHUTES_OAUTH_CLIENT_SECRET: result.clientSecret,
		};

		if (mode === 'single-account') {
			console.log('\nApp registered. Now we need to authorize your account.');
			const pkce = await generatePKCE();
			const state = crypto.randomBytes(16).toString('hex');
			const authUrl = buildAuthorizationUrl({
				clientId: result.clientId,
				redirectUri,
				scopes: DEFAULT_SCOPES,
				state,
				codeChallenge: pkce.codeChallenge,
			});

			console.log('\nOpen this URL in your browser to authorize:\n');
			console.log(authUrl);
			console.log('\nAfter authorizing, copy the "code" parameter from the callback URL.\n');

			const authCode = await ask('Enter the authorization code: ');
			if (!authCode) {
				console.error('Authorization code is required for single-account mode.');
				rl.close();
				process.exit(1);
			}

			const tokens = await runUpgradeToSingleAccount({
				clientId: result.clientId,
				clientSecret: result.clientSecret,
				redirectUri,
				authCode,
				codeVerifier: pkce.codeVerifier,
				envFilePath: '.env',
				writeToFile: false,
			});

			envVars.CHUTES_SERVER_ACCESS_TOKEN = tokens.accessToken;
			envVars.CHUTES_SERVER_REFRESH_TOKEN = tokens.refreshToken;
		}

		console.log('\nSetup complete!\n');

		const writeChoice = await ask('Write to .env file? [Y/n]: ');

		if (writeChoice.toLowerCase() !== 'n') {
			let filePath = '.env';
			const customPath = await ask(`File path (default: .env): `);
			if (customPath) {
				filePath = customPath;
			}

			const writeResult = writeEnvFile(filePath, envVars);
			if (writeResult.written.length > 0) {
				console.log(`\nWritten to ${filePath}:`);
				for (const key of writeResult.written) {
					console.log(`  ${key}`);
				}
			}
			if (writeResult.skipped.length > 0) {
				console.log(`\nSkipped (already exist in ${filePath}):`);
				for (const key of writeResult.skipped) {
					console.log(`  ${key}`);
				}
			}
		} else {
			console.log('\nAdd these to your environment:\n');
			console.log(formatEnvOutput(envVars));
		}

		console.log('\nDone! Restart n8n for the changes to take effect.\n');
	} catch (err) {
		console.error(`\nSetup failed: ${err instanceof Error ? err.message : String(err)}`);
		rl.close();
		process.exit(1);
	}

	rl.close();
}

