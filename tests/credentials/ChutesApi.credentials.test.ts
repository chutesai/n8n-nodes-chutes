/**
 * Tests for ChutesApi Credentials
 * Following TDD principles - tests are in /tests directory only
 */

import { ChutesApi } from '../../credentials/ChutesApi.credentials';

describe('ChutesApi Credentials', () => {
	let credentials: ChutesApi;
	const originalEnv = {
		CHUTES_OAUTH_CLIENT_ID: process.env.CHUTES_OAUTH_CLIENT_ID,
		CHUTES_OAUTH_CLIENT_SECRET: process.env.CHUTES_OAUTH_CLIENT_SECRET,
		CHUTES_IDP_BASE_URL: process.env.CHUTES_IDP_BASE_URL,
		CHUTES_CREDENTIAL_TEST_BASE_URL: process.env.CHUTES_CREDENTIAL_TEST_BASE_URL,
	};

	const restoreEnv = (key: keyof typeof originalEnv) => {
		const originalValue = originalEnv[key];
		if (originalValue === undefined) {
			delete process.env[key];
			return;
		}

		process.env[key] = originalValue;
	};

	beforeEach(() => {
		credentials = new ChutesApi();
		(credentials as any).helpers = {
			httpRequest: jest.fn(),
		};
	});

	afterEach(() => {
		restoreEnv('CHUTES_OAUTH_CLIENT_ID');
		restoreEnv('CHUTES_OAUTH_CLIENT_SECRET');
		restoreEnv('CHUTES_IDP_BASE_URL');
		restoreEnv('CHUTES_CREDENTIAL_TEST_BASE_URL');
		delete process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS;
		jest.useRealTimers();
	});

	describe('Basic Properties', () => {
		test('should have correct credential name', () => {
			expect(credentials.name).toBe('chutesApi');
		});

		test('should have correct display name', () => {
			expect(credentials.displayName).toBe('Chutes API');
		});

		test('should have documentation URL', () => {
			expect(credentials.documentationUrl).toBe('https://docs.chutes.ai/api');
		});
	});

	describe('Credential Properties', () => {
		test('should have API key property', () => {
			const apiKeyProperty = credentials.properties.find((prop) => prop.name === 'apiKey');

			expect(apiKeyProperty).toBeDefined();
			expect(apiKeyProperty?.displayName).toBe('API Key');
			expect(apiKeyProperty?.type).toBe('string');
			expect(apiKeyProperty?.required).toBe(false);
		});

		test('should have API key as password type', () => {
			const apiKeyProperty = credentials.properties.find((prop) => prop.name === 'apiKey');

			expect(apiKeyProperty?.typeOptions?.password).toBe(true);
		});

		test('should have environment selection property', () => {
			const envProperty = credentials.properties.find((prop) => prop.name === 'environment');

			expect(envProperty).toBeDefined();
			expect(envProperty?.type).toBe('options');
			expect(envProperty?.default).toBe('production');
		});

		test('should have production and sandbox environment options', () => {
			const envProperty = credentials.properties.find((prop) => prop.name === 'environment');
			const options = envProperty?.options as any[];

			expect(options).toContainEqual(
				expect.objectContaining({ name: 'Production', value: 'production' }),
			);
			expect(options).toContainEqual(
				expect.objectContaining({ name: 'Sandbox', value: 'sandbox' }),
			);
		});

		test('should have custom URL property', () => {
			const customUrlProperty = credentials.properties.find((prop) => prop.name === 'customUrl');

			expect(customUrlProperty).toBeDefined();
			expect(customUrlProperty?.type).toBe('string');
			expect(customUrlProperty?.required).toBe(false);
		});

		test('should have hidden session token property', () => {
			const sessionTokenProperty = credentials.properties.find((prop) => prop.name === 'sessionToken');

			expect(sessionTokenProperty).toBeDefined();
			expect(sessionTokenProperty?.type).toBe('hidden');
			expect(sessionTokenProperty?.typeOptions?.expirable).toBe(true);
		});

		test('should have hidden refresh token property', () => {
			const refreshTokenProperty = credentials.properties.find((prop) => prop.name === 'refreshToken');

			expect(refreshTokenProperty).toBeDefined();
			expect(refreshTokenProperty?.type).toBe('hidden');
			expect(refreshTokenProperty?.typeOptions?.password).toBe(true);
		});

		test('should have hidden granted scopes property', () => {
			const grantedScopesProperty = credentials.properties.find((prop) => prop.name === 'grantedScopes');

			expect(grantedScopesProperty).toBeDefined();
			expect(grantedScopesProperty?.type).toBe('hidden');
		});
	});

	describe('Authentication', () => {
		test('should use generic authentication type', () => {
			expect(credentials.authenticate?.type).toBe('generic');
		});

		test('should include Authorization header', () => {
			const headers = credentials.authenticate?.properties?.headers as any;

			expect(headers).toHaveProperty('Authorization');
			expect(headers.Authorization).toContain('Bearer');
			expect(headers.Authorization).toContain('$credentials.sessionToken');
		});

		test('should include custom client header', () => {
			const headers = credentials.authenticate?.properties?.headers as any;

			expect(headers).toHaveProperty('X-Chutes-Client', 'n8n-integration');
		});
	});

	describe('Credential Testing', () => {
		test('should have test configuration', () => {
			expect(credentials.test).toBeDefined();
			expect(credentials.test?.request).toBeDefined();
		});

	test('should test with /v1/models endpoint', () => {
		expect(credentials.test?.request?.url).toBe('/v1/models');
		expect(credentials.test?.request?.method).toBe('GET');
	});

		test('should use correct base URL for testing', () => {
			const baseURL = credentials.test?.request?.baseURL;

			expect(baseURL).toBeDefined();
			// Should dynamically select URL based on environment
			expect(baseURL).toContain('$credentials');
		});

		test('should allow overriding the credential test base URL via environment variable', () => {
			process.env.CHUTES_CREDENTIAL_TEST_BASE_URL = 'http://test-chutes-idp:8080';
			credentials = new ChutesApi();

			expect(credentials.test?.request?.baseURL).toBe('http://test-chutes-idp:8080');
		});
	});

	describe('SSO Token Refresh', () => {
		test('should skip token refresh when an API key is configured', async () => {
			const result = await credentials.preAuthentication.call(credentials as any, {
				apiKey: 'chutes-api-key',
				sessionToken: '',
				refreshToken: '',
			});

			expect(result).toEqual({});
			expect((credentials as any).helpers.httpRequest).not.toHaveBeenCalled();
		});

		test('should allow an active session token without refresh data when it is not near expiry', async () => {
			process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS = '300';

			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'session-token',
				refreshToken: '',
				tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			});

			expect(result).toEqual({});
			expect((credentials as any).helpers.httpRequest).not.toHaveBeenCalled();
		});

		test('should keep using an active session token when a refresh token exists but the access token is not near expiry', async () => {
			process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS = '300';

			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'session-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			});

			expect(result).toEqual({});
			expect((credentials as any).helpers.httpRequest).not.toHaveBeenCalled();
		});

		test('should force a token refresh when n8n marks the credential as expired for testing', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			process.env.CHUTES_IDP_BASE_URL = 'https://idp.example.test';
			process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS = '300';

			(credentials as any).helpers.httpRequest.mockResolvedValue({
				access_token: 'fresh-access-token',
				refresh_token: 'fresh-refresh-token',
				expires_in: 3600,
				scope: 'openid profile chutes:read chutes:invoke',
			});

			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'still-fresh-access-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
				__n8nForceCredentialRefresh: true,
			});

			expect((credentials as any).helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://idp.example.test/idp/token',
				}),
			);
			expect(result).toEqual(
				expect.objectContaining({
					sessionToken: 'fresh-access-token',
					refreshToken: 'fresh-refresh-token',
					grantedScopes: 'openid profile chutes:read chutes:invoke',
				}),
			);
		});

		test('should require the user to sign in again when the session token is near expiry and no refresh token exists', async () => {
			process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS = '300';

			await expect(
				credentials.preAuthentication.call(credentials as any, {
					sessionToken: 'session-token',
					refreshToken: '',
					tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
				}),
			).rejects.toThrow('Sign in with Chutes again');
		});

		test('should treat missing SSO fields as empty strings and require the user to sign in again', async () => {
			await expect(credentials.preAuthentication.call(credentials as any, {})).rejects.toThrow(
				'Sign in with Chutes again',
			);
		});

		test('should treat a blank expiry timestamp as not expiring soon', async () => {
			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'session-token',
				refreshToken: '',
				tokenExpiresAt: '',
			});

			expect(result).toEqual({});
			expect((credentials as any).helpers.httpRequest).not.toHaveBeenCalled();
		});

		test('should treat an invalid expiry timestamp as not expiring soon', async () => {
			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'session-token',
				refreshToken: '',
				tokenExpiresAt: 'not-a-date',
			});

			expect(result).toEqual({});
			expect((credentials as any).helpers.httpRequest).not.toHaveBeenCalled();
		});

		test('should fall back to the default refresh window when the configured window is invalid', async () => {
			process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS = '-1';

			await expect(
				credentials.preAuthentication.call(credentials as any, {
					sessionToken: 'session-token',
					refreshToken: '',
					tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
				}),
			).rejects.toThrow('Sign in with Chutes again');
		});

		test('should require OAuth client credentials before refreshing an SSO token', async () => {
			await expect(
				credentials.preAuthentication.call(credentials as any, {
					sessionToken: 'expired-token',
					refreshToken: 'refresh-token',
					tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
				}),
			).rejects.toThrow('Chutes OAuth client credentials are not configured on the n8n server.');
		});

		test('should require an HTTP request helper before refreshing an SSO token', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';

			await expect(
				credentials.preAuthentication.call({ helpers: {} } as any, {
					sessionToken: 'expired-token',
					refreshToken: 'refresh-token',
					tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
				}),
			).rejects.toThrow(
				'Chutes SSO refresh is unavailable because no HTTP request helper is configured.',
			);
		});

		test('should fall back to helpers.request when helpers.httpRequest is unavailable', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			delete process.env.CHUTES_IDP_BASE_URL;

			(credentials as any).helpers = {
				request: jest.fn().mockResolvedValue({
					access_token: 'fresh-access-token',
					refresh_token: 'fresh-refresh-token',
					scope: 'openid profile chutes:invoke',
				}),
			};

			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'expired-token',
				refreshToken: 'refresh-token',
				grantedScopes: 'openid profile',
				tokenExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
			});

			expect((credentials as any).helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://api.chutes.ai/idp/token',
				}),
			);
			expect(result).toEqual(
				expect.objectContaining({
					sessionToken: 'fresh-access-token',
					refreshToken: 'fresh-refresh-token',
					tokenExpiresAt: '',
				}),
			);
		});

		test('should refresh a Chutes SSO token when a refresh token is present', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			process.env.CHUTES_IDP_BASE_URL = 'https://idp.example.test';

			(credentials as any).helpers.httpRequest.mockResolvedValue({
				access_token: 'fresh-access-token',
				refresh_token: 'fresh-refresh-token',
				expires_in: 3600,
				scope: 'openid profile chutes:read chutes:invoke',
			});

			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'expired-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
			});

			expect((credentials as any).helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://idp.example.test/idp/token',
				}),
			);
			expect(result).toEqual(
				expect.objectContaining({
					authType: 'sso',
					sessionToken: 'fresh-access-token',
					refreshToken: 'fresh-refresh-token',
					grantedScopes: 'openid profile chutes:read chutes:invoke',
				}),
			);
			expect(result?.tokenExpiresAt).toEqual(expect.any(String));
		});

		test('should normalize granted scopes returned as an array', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';

			(credentials as any).helpers.httpRequest.mockResolvedValue({
				access_token: 'fresh-access-token',
				refresh_token: 'fresh-refresh-token',
				expires_in: 3600,
				scope: ['openid', 'profile', 'chutes:invoke'],
			});

			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'expired-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
			});

			expect(result).toEqual(
				expect.objectContaining({
					grantedScopes: 'openid profile chutes:invoke',
				}),
			);
		});

		test('should preserve the existing refresh token when the refresh response omits a new one', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';

			(credentials as any).helpers.httpRequest.mockResolvedValue({
				access_token: 'fresh-access-token',
				expires_in: 3600,
			});

			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'expired-token',
				refreshToken: 'existing-refresh-token',
				tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
			});

			expect(result).toEqual(
				expect.objectContaining({
					sessionToken: 'fresh-access-token',
					refreshToken: 'existing-refresh-token',
				}),
			);
		});

		test('should preserve previously granted scopes when refresh response omits scope', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';

			(credentials as any).helpers.httpRequest.mockResolvedValue({
				access_token: 'fresh-access-token',
				expires_in: 3600,
			});

			const result = await credentials.preAuthentication.call(credentials as any, {
				sessionToken: 'expired-token',
				refreshToken: 'existing-refresh-token',
				grantedScopes: 'openid profile chutes:invoke',
				tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
			});

			expect(result).toEqual(
				expect.objectContaining({
					sessionToken: 'fresh-access-token',
					grantedScopes: 'openid profile chutes:invoke',
				}),
			);
		});

		test('should fail when refresh does not return a fresh access token', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';

			(credentials as any).helpers.httpRequest.mockResolvedValue({
				refresh_token: 'fresh-refresh-token',
			});

			await expect(
				credentials.preAuthentication.call(credentials as any, {
					sessionToken: 'expired-token',
					refreshToken: 'refresh-token',
					tokenExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
				}),
			).rejects.toThrow('Failed to refresh the Chutes SSO token. Sign in with Chutes again.');
		});
	});
});
