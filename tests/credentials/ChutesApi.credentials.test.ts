/**
 * Tests for ChutesApi Credentials
 * Following TDD principles - tests are in /tests directory only
 */

import { ChutesApi } from '../../credentials/ChutesApi.credentials';

describe('ChutesApi Credentials', () => {
	let credentials: ChutesApi;

	beforeEach(() => {
		credentials = new ChutesApi();
	});

	describe('Basic Properties', () => {
		test('should have correct credential name', () => {
			expect(credentials.name).toBe('chutesApi');
		});

		test('should have correct display name', () => {
			expect(credentials.displayName).toBe('Chutes API');
		});

		test('should have documentation URL', () => {
			expect(credentials.documentationUrl).toBe('https://chutes.ai/app/api');
		});

		test('should use the Chutes logo icon', () => {
			expect((credentials as any).icon).toBe('file:../nodes/Chutes/chutes.png');
		});
	});

	describe('Credential Properties', () => {
		test('should NOT extend oAuth2Api (simple API key credential)', () => {
			expect((credentials as any).extends).toBeUndefined();
		});

		test('should NOT include any OAuth-specific fields', () => {
			const oauthOnlyFields = [
				'grantType',
				'authUrl',
				'accessTokenUrl',
				'clientId',
				'clientSecret',
				'scope',
				'authQueryParameters',
				'oauthClientConfigured',
				'oauthRedirectHelp',
				'oauthEnvWarning',
				'oauthConnectHelp',
			];

			for (const fieldName of oauthOnlyFields) {
				const field = credentials.properties.find((prop) => prop.name === fieldName);
				expect(field).toBeUndefined();
			}
		});

		test('should have API key property as not required (server token may be used instead)', () => {
			const original = process.env.CHUTES_SERVER_ACCESS_TOKEN;
			delete process.env.CHUTES_SERVER_ACCESS_TOKEN;

			const configured = new ChutesApi();
			const apiKeyProperty = configured.properties.find((prop) => prop.name === 'apiKey');

			expect(apiKeyProperty).toBeDefined();
			expect(apiKeyProperty?.displayName).toBe('Chutes API Key');
			expect(apiKeyProperty?.type).toBe('string');
			expect(apiKeyProperty?.required).toBe(false);

			process.env.CHUTES_SERVER_ACCESS_TOKEN = original;
		});

		test('should have hidden serverAccessToken field defaulting to env var', () => {
			const field = credentials.properties.find((prop) => prop.name === 'serverAccessToken');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
			expect(field?.default).toContain('CHUTES_SERVER_ACCESS_TOKEN');
		});

		test('should have hidden serverRefreshToken field defaulting to env var', () => {
			const field = credentials.properties.find((prop) => prop.name === 'serverRefreshToken');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
			expect(field?.default).toContain('CHUTES_SERVER_REFRESH_TOKEN');
		});

		test('should show server account notice when CHUTES_SERVER_ACCESS_TOKEN is set', () => {
			const original = process.env.CHUTES_SERVER_ACCESS_TOKEN;
			process.env.CHUTES_SERVER_ACCESS_TOKEN = 'some-token';

			const configured = new ChutesApi();
			const notice = configured.properties.find(
				(prop) => prop.type === 'notice' && prop.name === 'serverAccountNotice',
			);
			expect(notice).toBeDefined();
			expect(notice?.displayName).toContain('server account');

			process.env.CHUTES_SERVER_ACCESS_TOKEN = original;
		});

		test('should label API key as Do Not Use when server token is set', () => {
			const original = process.env.CHUTES_SERVER_ACCESS_TOKEN;
			process.env.CHUTES_SERVER_ACCESS_TOKEN = 'some-token';

			const configured = new ChutesApi();
			const apiKeyField = configured.properties.find((prop) => prop.name === 'apiKey');
			expect(apiKeyField?.displayName).toContain('Do Not Use');
			expect(apiKeyField?.displayName).toContain('Server Account');
			expect(apiKeyField?.hint).toContain('Save and close');

			process.env.CHUTES_SERVER_ACCESS_TOKEN = original;
		});

		test('should keep normal API key label when server token is not set', () => {
			const original = process.env.CHUTES_SERVER_ACCESS_TOKEN;
			delete process.env.CHUTES_SERVER_ACCESS_TOKEN;

			const configured = new ChutesApi();
			const apiKeyField = configured.properties.find((prop) => prop.name === 'apiKey');
			expect(apiKeyField?.displayName).toBe('Chutes API Key');
			expect(apiKeyField?.hint).not.toContain('Save and close');

			process.env.CHUTES_SERVER_ACCESS_TOKEN = original;
		});

		test('should NOT show server account notice when CHUTES_SERVER_ACCESS_TOKEN is not set', () => {
			const original = process.env.CHUTES_SERVER_ACCESS_TOKEN;
			delete process.env.CHUTES_SERVER_ACCESS_TOKEN;

			const configured = new ChutesApi();
			const notice = configured.properties.find(
				(prop) => prop.type === 'notice' && prop.name === 'serverAccountNotice',
			);
			expect(notice).toBeUndefined();

			process.env.CHUTES_SERVER_ACCESS_TOKEN = original;
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
			expect(customUrlProperty?.type).toBe('hidden');
		});


		test('should define hidden SSO credential fields', () => {
			const expectedHiddenFields = [
				'sessionToken',
				'refreshToken',
				'tokenExpiresAt',
				'grantedScopes',
				'chutesSubject',
				'chutesUsername',
			];

			for (const fieldName of expectedHiddenFields) {
				const field = credentials.properties.find((prop) => prop.name === fieldName);
				expect(field).toBeDefined();
				expect(field?.type).toBe('hidden');
			}
		});
	});

	describe('Authentication', () => {
		test('should use generic authentication type', () => {
			expect(credentials.authenticate?.type).toBe('generic');
		});

		test('should include Authorization header using apiKey, sessionToken, or serverAccessToken', () => {
			const headers = credentials.authenticate?.properties?.headers as any;

			expect(headers).toHaveProperty('Authorization');
			expect(headers.Authorization).toContain('Bearer');
			expect(headers.Authorization).toContain('$credentials.apiKey');
			expect(headers.Authorization).toContain('$credentials.sessionToken');
			expect(headers.Authorization).toContain('$credentials.serverAccessToken');
			expect(headers.Authorization).not.toContain('$credentials.accessToken');
		});

		test('should include custom client header', () => {
			const headers = credentials.authenticate?.properties?.headers as any;

			expect(headers).toHaveProperty('X-Chutes-Client', 'n8n-integration');
		});
	});

	describe('preAuthentication token refresh', () => {
		const originalEnv = { ...process.env };

		beforeEach(() => {
			process.env = {
				...originalEnv,
				CHUTES_OAUTH_CLIENT_ID: 'client-id',
				CHUTES_OAUTH_CLIENT_SECRET: 'client-secret',
				CHUTES_IDP_BASE_URL: 'https://api.chutes.ai',
			};
		});

		afterEach(() => {
			process.env = { ...originalEnv };
		});

		test('should refresh using serverRefreshToken when sessionToken is empty and serverAccessToken is present', async () => {
			const httpRequest = jest.fn().mockResolvedValue({
				access_token: 'fresh-session-token',
				refresh_token: 'fresh-refresh-token',
				expires_in: 3600,
				scope: 'invoke',
			});
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				apiKey: '',
				serverAccessToken: 'expired-server-token',
				serverRefreshToken: 'server-refresh-token',
			});

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://api.chutes.ai/idp/token',
				}),
			);
			expect(result).toEqual(
				expect.objectContaining({
					sessionToken: 'fresh-session-token',
					refreshToken: 'fresh-refresh-token',
				}),
			);
		});

		test('should fall back to serverAccessToken when no refreshToken or serverRefreshToken available', async () => {
			const httpRequest = jest.fn();
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				apiKey: '',
				serverAccessToken: 'server-managed-token',
				serverRefreshToken: '',
				refreshToken: '',
			});

			expect(result).toEqual({});
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('should skip refresh when apiKey exists', async () => {
			const httpRequest = jest.fn();
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				apiKey: 'plain-api-key',
			});

			expect(result).toEqual({});
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('should throw when refresh token is missing and token is expiring', async () => {
			(credentials as any).helpers = { httpRequest: jest.fn() };

			await expect(
				(credentials as any).preAuthentication.call(credentials as any, {
					sessionToken: 'session-token',
					tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
					refreshToken: '',
				}),
			).rejects.toThrow('expired or can no longer be refreshed');
		});

		test('should handle missing session/refresh/expiry fields as empty strings', async () => {
			(credentials as any).helpers = { httpRequest: jest.fn() };

			await expect(
				(credentials as any).preAuthentication.call(credentials as any, {
					apiKey: '',
				}),
			).rejects.toThrow('expired or can no longer be refreshed');
		});

		test('should throw when OAuth env vars are missing', async () => {
			delete process.env.CHUTES_OAUTH_CLIENT_ID;
			delete process.env.CHUTES_OAUTH_CLIENT_SECRET;
			(credentials as any).helpers = { httpRequest: jest.fn() };

			await expect(
				(credentials as any).preAuthentication.call(credentials as any, {
					sessionToken: 'session-token',
					tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
					refreshToken: 'refresh-token',
				}),
			).rejects.toThrow('not configured on the n8n server');
		});

		test('should throw when request helper is unavailable', async () => {
			(credentials as any).helpers = {};

			await expect(
				(credentials as any).preAuthentication.call(credentials as any, {
					sessionToken: 'session-token',
					tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
					refreshToken: 'refresh-token',
				}),
			).rejects.toThrow('no HTTP request helper is configured');
		});

		test('should refresh token when expiring and persist token metadata', async () => {
			const httpRequest = jest.fn().mockResolvedValue({
				access_token: 'new-access-token',
				refresh_token: 'new-refresh-token',
				expires_in: 3600,
				scope: 'invoke chutes:invoke',
			});
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'old-session-token',
				refreshToken: 'old-refresh-token',
				tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
			});

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://api.chutes.ai/idp/token',
				}),
			);
			expect(result).toEqual(
				expect.objectContaining({
					authType: 'sso',
					sessionToken: 'new-access-token',
					refreshToken: 'new-refresh-token',
					grantedScopes: 'invoke chutes:invoke',
				}),
			);
			expect(typeof (result as any).tokenExpiresAt).toBe('string');
		});

		test('should preserve existing refresh token when response omits it', async () => {
			const httpRequest = jest.fn().mockResolvedValue({
				access_token: 'new-access-token',
				expires_in: 1200,
				scope: 'invoke',
			});
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'old-session-token',
				refreshToken: 'existing-refresh-token',
				tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
			});

			expect(result).toEqual(
				expect.objectContaining({
					sessionToken: 'new-access-token',
					refreshToken: 'existing-refresh-token',
				}),
			);
		});

		test('should normalize array scopes from refresh response', async () => {
			const httpRequest = jest.fn().mockResolvedValue({
				access_token: 'new-access-token',
				refresh_token: 'new-refresh-token',
				expires_in: 1200,
				scope: [' invoke ', 'admin'],
			});
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'old-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
			});

			expect((result as any).grantedScopes).toBe('invoke admin');
		});

		test('should refresh when token expiry is blank/invalid', async () => {
			process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS = '-1';
			const httpRequest = jest
				.fn()
				.mockResolvedValueOnce({
					access_token: 'token-with-blank-expiry',
					refresh_token: 'refresh-token',
					expires_in: 1200,
				})
				.mockResolvedValueOnce({
					access_token: 'token-with-invalid-expiry',
					refresh_token: 'refresh-token',
					expires_in: 1200,
				});
			(credentials as any).helpers = { httpRequest };

			await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'old-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: '',
				__n8nForceCredentialRefresh: true,
			});

			await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'old-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: 'not-a-date',
				__n8nForceCredentialRefresh: true,
			});

			expect(httpRequest).toHaveBeenCalledTimes(2);
		});

		test('should skip refresh when session token is not expiring', async () => {
			const httpRequest = jest.fn();
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'fresh-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
			});

			expect(result).toEqual({});
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('should skip refresh when token expiry is blank or invalid without force refresh', async () => {
			const httpRequest = jest.fn();
			(credentials as any).helpers = { httpRequest };

			const blankResult = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'fresh-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: '',
			});
			const invalidResult = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'fresh-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: 'not-a-date',
			});

			expect(blankResult).toEqual({});
			expect(invalidResult).toEqual({});
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('should throw when refreshed response has no access_token', async () => {
			const httpRequest = jest.fn().mockResolvedValue({
				refresh_token: 'new-refresh-token',
				expires_in: 1200,
			});
			(credentials as any).helpers = { httpRequest };

			await expect(
				(credentials as any).preAuthentication.call(credentials as any, {
					sessionToken: 'old-token',
					refreshToken: 'refresh-token',
					tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
					grantedScopes: null,
				}),
			).rejects.toThrow('Failed to refresh the Chutes SSO token');
		});

		test('should normalize scopes to empty string when response and credentials have no scope', async () => {
			const httpRequest = jest.fn().mockResolvedValue({
				access_token: 'new-access-token',
				refresh_token: 'new-refresh-token',
				expires_in: 1200,
			});
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'old-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
				grantedScopes: undefined,
			});

			expect((result as any).grantedScopes).toBe('');
		});

		test('should use default refresh window when env value is invalid', async () => {
			process.env.N8N_EXPIRABLE_CREDENTIAL_REFRESH_WINDOW_SECONDS = 'not-a-number';
			(credentials as any).helpers = { httpRequest: jest.fn() };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'fresh-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
			});

			expect(result).toEqual({});
		});

		test('should use default IDP base URL when CHUTES_IDP_BASE_URL is unset', async () => {
			delete process.env.CHUTES_IDP_BASE_URL;
			const httpRequest = jest.fn().mockResolvedValue({
				access_token: 'new-access-token',
				refresh_token: 'new-refresh-token',
				expires_in: 1200,
			});
			(credentials as any).helpers = { httpRequest };

			await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'old-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
			});

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://api.chutes.ai/idp/token',
				}),
			);
		});

		test('should set blank tokenExpiresAt when expires_in is non-numeric', async () => {
			const httpRequest = jest.fn().mockResolvedValue({
				access_token: 'new-access-token',
				refresh_token: 'new-refresh-token',
				expires_in: 'unknown',
			});
			(credentials as any).helpers = { httpRequest };

			const result = await (credentials as any).preAuthentication.call(credentials as any, {
				sessionToken: 'old-token',
				refreshToken: 'refresh-token',
				tokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
			});

			expect((result as any).tokenExpiresAt).toBe('');
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

		test('should use configured CHUTES_CREDENTIAL_TEST_BASE_URL override', () => {
			const original = process.env.CHUTES_CREDENTIAL_TEST_BASE_URL;
			process.env.CHUTES_CREDENTIAL_TEST_BASE_URL = 'https://custom-test-base.chutes.ai';

			const configured = new ChutesApi();
			expect(configured.test?.request?.baseURL).toBe('https://custom-test-base.chutes.ai');

			process.env.CHUTES_CREDENTIAL_TEST_BASE_URL = original;
		});
	});
});

