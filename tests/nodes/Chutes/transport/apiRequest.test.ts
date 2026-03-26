/**
 * Tests for API Request Helper
 * Following TDD principles - all tests in /tests directory
 */

import {
	chutesApiRequest,
	chutesApiRequestWithRetry,
	getChutesBaseUrl,
	parseGrantedScopes,
} from '../../../../nodes/Chutes/transport/apiRequest';
import { IDataObject } from 'n8n-workflow';

describe('API Request Helper', () => {
	describe('getChutesBaseUrl', () => {
		test('should return LLM chute URL by default (production)', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration');

			expect(result).toBe('https://llm.chutes.ai');
		});

		test('should return image chute URL for image generation', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'imageGeneration');

			expect(result).toBe('https://image.chutes.ai');
		});

		test('should return video chute URL for video generation', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'videoGeneration');

			expect(result).toBe('https://video.chutes.ai');
		});

		test('should return audio chute URL for audio generation', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'audioGeneration');

			expect(result).toBe('https://audio.chutes.ai');
		});

		test('should return sandbox URL when environment is sandbox', () => {
			const credentials: IDataObject = {
				environment: 'sandbox',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration');

			expect(result).toBe('https://sandbox-llm.chutes.ai');
		});

		test('should prioritize custom chute URL from parameter', () => {
			const credentials: IDataObject = {
				customUrl: 'https://credentials-custom.chutes.ai',
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration', 'https://param-custom.chutes.ai');

			expect(result).toBe('https://param-custom.chutes.ai');
		});

		test('should use credentials customUrl when no parameter customUrl provided', () => {
			const credentials: IDataObject = {
				customUrl: 'https://custom.api.chutes.ai',
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration');

			expect(result).toBe('https://custom.api.chutes.ai');
		});

		test('should prioritize customChuteUrl over credentials customUrl', () => {
			const credentials: IDataObject = {
				customUrl: 'https://credentials-url.com',
				environment: 'sandbox',
			};

			const result = getChutesBaseUrl(credentials, 'textGeneration', 'https://parameter-url.com');

			expect(result).toBe('https://parameter-url.com');
		});

		test('should handle inference resource type (uses LLM subdomain)', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials, 'inference');

			expect(result).toBe('https://llm.chutes.ai');
		});

		test('should default to LLM chute when no resource type specified', () => {
			const credentials: IDataObject = {
				environment: 'production',
			};

			const result = getChutesBaseUrl(credentials);

			expect(result).toBe('https://llm.chutes.ai');
		});
	});

	// Note: Testing chutesApiRequest and chutesApiRequestWithRetry requires mocking
	// the IExecuteFunctions context, which is covered in integration tests

	describe('scope helpers', () => {
		test('should parse granted scopes from string', () => {
			expect(parseGrantedScopes('invoke chutes:invoke admin')).toEqual([
				'invoke',
				'chutes:invoke',
				'admin',
			]);
		});

		test('should parse granted scopes from array', () => {
			expect(parseGrantedScopes([' invoke ', 'admin'])).toEqual(['invoke', 'admin']);
		});

		test('should return empty scopes for invalid input', () => {
			expect(parseGrantedScopes(null)).toEqual([]);
		});
	});

	describe('chutesApiRequest scope enforcement', () => {
		const originalFetch = global.fetch;
		const originalEnv = { ...process.env };

		afterEach(() => {
			global.fetch = originalFetch;
			process.env = { ...originalEnv };
			jest.restoreAllMocks();
		});

		function createContext(credentials: IDataObject) {
			return {
				getCredentials: jest.fn().mockResolvedValue(credentials),
				helpers: {
					requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
				},
				getNode: jest.fn().mockReturnValue({
					name: 'Test Node',
					type: 'n8n-nodes-chutes.chutes',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
			} as any;
		}

		test('should bypass scope check for apiKey credentials', async () => {
			const context = createContext({
				apiKey: 'api-key',
				authType: 'apiKey',
			});

			await chutesApiRequest.call(context, 'GET', '/v1/models');

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		test('should allow SSO credentials with invoke scope', async () => {
			const context = createContext({
				authType: 'sso',
				sessionToken: 'session-token',
				grantedScopes: 'profile invoke',
			});

			await chutesApiRequest.call(context, 'GET', '/v1/models');

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		test('should block under-scoped SSO token', async () => {
			const context = createContext({
				authType: 'sso',
				sessionToken: 'session-token',
				grantedScopes: 'profile email',
			});

			await expect(chutesApiRequest.call(context, 'GET', '/v1/models')).rejects.toThrow(
				'cannot invoke models',
			);
		});

		test('should introspect token when grantedScopes metadata is missing', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			process.env.CHUTES_IDP_BASE_URL = 'https://api.chutes.ai';

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ scope: 'invoke profile' }),
			} as any);

			const context = createContext({
				authType: 'sso',
				sessionToken: 'session-token',
				grantedScopes: '',
			});

			await chutesApiRequest.call(context, 'GET', '/v1/models');

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.chutes.ai/idp/token/introspect',
				expect.objectContaining({
					method: 'POST',
				}),
			);
		});

		test('should cache introspection for same token', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			process.env.CHUTES_IDP_BASE_URL = 'https://api.chutes.ai';

			const fetchMock = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ scope: 'invoke profile' }),
			} as any);
			global.fetch = fetchMock;

			const contextA = createContext({
				authType: 'sso',
				sessionToken: 'same-token',
				grantedScopes: '',
			});
			const contextB = createContext({
				authType: 'sso',
				sessionToken: 'same-token',
				grantedScopes: '',
			});

			await chutesApiRequest.call(contextA, 'GET', '/v1/models');
			await chutesApiRequest.call(contextB, 'GET', '/v1/models');

			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		test('should ignore introspection when oauth env vars are missing', async () => {
			delete process.env.CHUTES_OAUTH_CLIENT_ID;
			delete process.env.CHUTES_OAUTH_CLIENT_SECRET;

			const context = createContext({
				authType: 'sso',
				sessionToken: 'token-without-env',
				grantedScopes: '',
			});

			await chutesApiRequest.call(context, 'GET', '/v1/models');
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		test('should allow non-SSO credentials without apiKey', async () => {
			const context = createContext({
				authType: 'manualToken',
				sessionToken: 'session-token',
			});

			await chutesApiRequest.call(context, 'GET', '/v1/models');
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		test('should continue when introspection returns no scopes', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			process.env.CHUTES_IDP_BASE_URL = 'https://api.chutes.ai';

			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				json: async () => ({}),
			} as any);

			const context = createContext({
				authType: 'sso',
				sessionToken: 'token-no-scopes',
				grantedScopes: '',
			});

			await chutesApiRequest.call(context, 'GET', '/v1/models');
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		test('should use default IDP base URL during introspection when env is unset', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			delete process.env.CHUTES_IDP_BASE_URL;

			const fetchMock = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ scope: 'invoke' }),
			} as any);
			global.fetch = fetchMock;

			const context = createContext({
				authType: 'sso',
				sessionToken: 'token-default-idp',
				grantedScopes: '',
			});

			await chutesApiRequest.call(context, 'GET', '/v1/models');
			expect(fetchMock).toHaveBeenCalledWith(
				'https://api.chutes.ai/idp/token/introspect',
				expect.any(Object),
			);
		});

		test('should wrap downstream errors as NodeApiError', async () => {
			const context = createContext({
				apiKey: 'api-key',
				authType: 'apiKey',
			});
			context.helpers.requestWithAuthentication.mockRejectedValue({
				message: 'network-failure',
				description: 'downstream error',
			});

			await expect(chutesApiRequest.call(context, 'GET', '/v1/models')).rejects.toThrow(
				'Chutes.ai API error: network-failure',
			);
		});

		test('should keep request body for non-GET methods', async () => {
			const context = createContext({
				apiKey: 'api-key',
				authType: 'apiKey',
			});

			await chutesApiRequest.call(context, 'POST', '/v1/models', { hello: 'world' });

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					method: 'POST',
					body: { hello: 'world' },
				}),
			);
		});

		test('should use OAuth credential when chutesApi is unavailable', async () => {
			const context = {
				getCredentials: jest
					.fn()
					.mockRejectedValueOnce(new Error('No data found for credential chutesApi'))
					.mockResolvedValueOnce({
						accessToken: 'oauth-access-token',
						environment: 'production',
					}),
				helpers: {
					requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
				},
				getNode: jest.fn().mockReturnValue({
					name: 'Test Node',
					type: 'n8n-nodes-chutes.chutes',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
			} as any;

			await chutesApiRequest.call(context, 'GET', '/v1/models');

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'chutesOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					url: expect.stringContaining('/v1/models'),
				}),
			);
		});

		test('should throw fallback credential error when neither credential exists', async () => {
			const context = {
				getCredentials: jest
					.fn()
					.mockRejectedValueOnce(new Error('No data found for credential chutesApi'))
					.mockRejectedValueOnce(new Error('No data found for credential chutesOAuth2Api')),
				helpers: {
					requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
				},
				getNode: jest.fn().mockReturnValue({
					name: 'Test Node',
					type: 'n8n-nodes-chutes.chutes',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
			} as any;

			await expect(chutesApiRequest.call(context, 'GET', '/v1/models')).rejects.toThrow(
				'No data found for credential chutesOAuth2Api',
			);
		});

		test('should normalize non-error credential lookup failures', async () => {
			const context = {
				getCredentials: jest.fn().mockRejectedValueOnce('bad credentials').mockRejectedValueOnce(null),
				helpers: {
					requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
				},
				getNode: jest.fn().mockReturnValue({
					name: 'Test Node',
					type: 'n8n-nodes-chutes.chutes',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
			} as any;

			await expect(chutesApiRequest.call(context, 'GET', '/v1/models')).rejects.toThrow(
				'No Chutes credential is configured.',
			);
		});
	});

	describe('chutesApiRequestWithRetry', () => {
		function createRetryContext() {
			return {
				getCredentials: jest.fn().mockResolvedValue({ apiKey: 'api-key' }),
				helpers: {
					requestWithAuthentication: jest.fn(),
				},
				getNode: jest.fn().mockReturnValue({
					name: 'Retry Node',
					type: 'n8n-nodes-chutes.chutes',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
			} as any;
		}

		test('retries when httpCode is 429 number', async () => {
			const context = createRetryContext();
			context.helpers.requestWithAuthentication
				.mockRejectedValueOnce({ httpCode: 429, message: 'rate-limited' })
				.mockResolvedValueOnce({ ok: true });

			await chutesApiRequestWithRetry.call(context, 'GET', '/v1/models');
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		test('retries when httpCode is 429 string', async () => {
			const context = createRetryContext();
			context.helpers.requestWithAuthentication
				.mockRejectedValueOnce({ httpCode: '429', message: 'rate-limited' })
				.mockResolvedValueOnce({ ok: true, headers: { 'x-ratelimit-remaining': '9' } });

			await chutesApiRequestWithRetry.call(context, 'GET', '/v1/models');
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		test('throws immediately when httpCode is not 429', async () => {
			const context = createRetryContext();
			context.helpers.requestWithAuthentication.mockRejectedValue({
				httpCode: 500,
				message: 'server-error',
			});

			await expect(chutesApiRequestWithRetry.call(context, 'GET', '/v1/models')).rejects.toBeDefined();
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('throws when httpCode is absent (status parsing fallback)', async () => {
			const context = createRetryContext();
			context.helpers.requestWithAuthentication.mockRejectedValue({
				message: 'generic-failure',
			});

			await expect(chutesApiRequestWithRetry.call(context, 'GET', '/v1/models')).rejects.toBeDefined();
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('throws when httpCode is NaN number', async () => {
			const context = createRetryContext();
			context.getCredentials = jest.fn().mockRejectedValue({
				httpCode: Number.NaN,
				message: 'invalid-number',
			});

			await expect(chutesApiRequestWithRetry.call(context, 'GET', '/v1/models')).rejects.toBeDefined();
			expect(context.getCredentials).toHaveBeenCalledTimes(2);
		});

		test('throws when httpCode is non-numeric string', async () => {
			const context = createRetryContext();
			context.helpers.requestWithAuthentication.mockRejectedValue({
				httpCode: 'not-a-status',
				message: 'invalid-string',
			});

			await expect(chutesApiRequestWithRetry.call(context, 'GET', '/v1/models')).rejects.toBeDefined();
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('does not warn when remaining rate limit is healthy', async () => {
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
			const context = createRetryContext();
			context.helpers.requestWithAuthentication.mockResolvedValue({
				ok: true,
				headers: { 'x-ratelimit-remaining': '20' },
			});

			await chutesApiRequestWithRetry.call(context, 'GET', '/v1/models');
			expect(warnSpy).not.toHaveBeenCalled();
		});
	});
});

