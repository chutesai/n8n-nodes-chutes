/**
 * Tests for API Request Helper
 * Following TDD principles - all tests in /tests directory
 */

import { IDataObject, NodeApiError } from 'n8n-workflow';

import {
	chutesApiRequest,
	chutesApiRequestWithRetry,
	getChutesBaseUrl,
	parseGrantedScopes,
} from '../../../../nodes/Chutes/transport/apiRequest';

describe('API Request Helper', () => {
	const originalEnv = {
		CHUTES_OAUTH_CLIENT_ID: process.env.CHUTES_OAUTH_CLIENT_ID,
		CHUTES_OAUTH_CLIENT_SECRET: process.env.CHUTES_OAUTH_CLIENT_SECRET,
		CHUTES_IDP_BASE_URL: process.env.CHUTES_IDP_BASE_URL,
	};
	const originalFetch = global.fetch;
	const originalWarn = console.warn;

	const restoreEnv = (key: keyof typeof originalEnv) => {
		const originalValue = originalEnv[key];
		if (originalValue === undefined) {
			delete process.env[key];
			return;
		}

		process.env[key] = originalValue;
	};

	const createMockContext = (credentials: IDataObject, requestWithAuthentication?: jest.Mock) => ({
		getCredentials: jest.fn().mockResolvedValue(credentials),
		helpers: {
			requestWithAuthentication: requestWithAuthentication ?? jest.fn().mockResolvedValue({ ok: true }),
		},
		getNode: jest.fn().mockReturnValue({ name: 'Chutes' }),
	});

	beforeEach(() => {
		delete process.env.CHUTES_OAUTH_CLIENT_ID;
		delete process.env.CHUTES_OAUTH_CLIENT_SECRET;
		delete process.env.CHUTES_IDP_BASE_URL;
		global.fetch = jest.fn();
		console.warn = jest.fn();
	});

	afterEach(() => {
		restoreEnv('CHUTES_OAUTH_CLIENT_ID');
		restoreEnv('CHUTES_OAUTH_CLIENT_SECRET');
		restoreEnv('CHUTES_IDP_BASE_URL');
		global.fetch = originalFetch;
		console.warn = originalWarn;
		jest.restoreAllMocks();
		jest.useRealTimers();
	});

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

		test('should map text-to-speech to the audio chute', () => {
			expect(getChutesBaseUrl({ environment: 'production' }, 'textToSpeech')).toBe(
				'https://audio.chutes.ai',
			);
		});

		test('should map speech-to-text to the STT chute', () => {
			expect(getChutesBaseUrl({ environment: 'production' }, 'speechToText')).toBe(
				'https://stt.chutes.ai',
			);
		});

		test('should map embeddings and moderation to the llm chute', () => {
			expect(getChutesBaseUrl({ environment: 'production' }, 'embeddings')).toBe(
				'https://llm.chutes.ai',
			);
			expect(getChutesBaseUrl({ environment: 'production' }, 'contentModeration')).toBe(
				'https://llm.chutes.ai',
			);
		});

		test('should map music generation to the audio chute', () => {
			expect(getChutesBaseUrl({ environment: 'production' }, 'musicGeneration')).toBe(
				'https://audio.chutes.ai',
			);
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

	describe('parseGrantedScopes', () => {
		test('should parse a space-delimited scope string', () => {
			expect(parseGrantedScopes('openid profile chutes:invoke')).toEqual([
				'openid',
				'profile',
				'chutes:invoke',
			]);
		});

		test('should normalize an array of scopes', () => {
			expect(parseGrantedScopes(['openid', 'profile', 'chutes:invoke'])).toEqual([
				'openid',
				'profile',
				'chutes:invoke',
			]);
		});

		test('should return an empty list for unknown input', () => {
			expect(parseGrantedScopes(undefined)).toEqual([]);
		});
	});

	describe('chutesApiRequest', () => {
		test('should execute a request with an API key without checking scopes', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ id: 'ok' });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			const response = await chutesApiRequest.call(
				context as any,
				'POST',
				'/v1/chat/completions',
				{ prompt: 'hello' },
				{ stream: false },
				{ 'X-Extra': 'value' },
				{ timeout: 1000 },
				'textGeneration',
			);

			expect(response).toEqual({ id: 'ok' });
			expect(global.fetch).not.toHaveBeenCalled();
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://llm.chutes.ai/v1/chat/completions',
					qs: { stream: false },
					body: { prompt: 'hello' },
					timeout: 1000,
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Accept: 'application/json',
						'User-Agent': 'n8n-ChutesAI/0.0.9',
						'X-Chutes-Source': 'n8n-integration',
						'X-Extra': 'value',
					}),
				}),
			);
		});

		test('should strip GET bodies before executing the request', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(
				context as any,
				'GET',
				'/v1/models',
				{ should: 'not-be-sent' },
			);

			const requestOptions = requestWithAuthentication.mock.calls[0][1];
			expect(requestOptions.body).toBeUndefined();
		});

		test('should allow non-SSO credentials to bypass scope checks', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'manual',
					sessionToken: 'cak_token',
					environment: 'sandbox',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models', {}, {}, {}, {}, 'imageGeneration');

			expect(global.fetch).not.toHaveBeenCalled();
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'chutesApi',
				expect.objectContaining({
					url: 'https://sandbox-image.chutes.ai/v1/models',
				}),
			);
		});

		test('should allow SSO credentials without a session token to proceed without introspection', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					grantedScopes: '',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(global.fetch).not.toHaveBeenCalled();
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should allow SSO credentials with a null session token to proceed without introspection', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: null,
					grantedScopes: '',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(global.fetch).not.toHaveBeenCalled();
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should bypass SSO scope checks when the auth type is missing', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					sessionToken: 'cak_token',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(global.fetch).not.toHaveBeenCalled();
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should bypass SSO scope checks when the auth type is null', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: null,
					sessionToken: 'cak_token',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(global.fetch).not.toHaveBeenCalled();
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should allow SSO credentials with granted chutes:invoke scope', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: 'cak_token',
					grantedScopes: 'openid profile chutes:invoke',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(global.fetch).not.toHaveBeenCalled();
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should allow SSO credentials with granted admin scope', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: 'cak_token',
					grantedScopes: 'openid admin',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should introspect a token once and cache the granted scopes', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			process.env.CHUTES_IDP_BASE_URL = 'https://idp.example.test/';

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({
					scope: 'openid profile chutes:invoke',
				}),
			});
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: 'cak_cached',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');
			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(global.fetch).toHaveBeenCalledWith(
				'https://idp.example.test/idp/token/introspect',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						Authorization: expect.stringContaining('Basic '),
					}),
				}),
			);
		});

		test('should continue when scope introspection is unavailable', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: 'cak_token',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(global.fetch).not.toHaveBeenCalled();
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should ignore unsuccessful token introspection responses', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
			});
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: 'cak_unknown',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should default token introspection to the public Chutes IDP base URL', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';
			delete process.env.CHUTES_IDP_BASE_URL;

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({
					scope: 'openid profile chutes:invoke',
				}),
			});
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: 'cak_default_idp',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequest.call(context as any, 'GET', '/v1/models');

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.chutes.ai/idp/token/introspect',
				expect.any(Object),
			);
		});

		test('should reject SSO credentials that introspect without invoke permissions', async () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'client-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'client-secret';

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({
					scope: 'openid profile',
				}),
			});
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: 'cak_forbidden',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await expect(chutesApiRequest.call(context as any, 'GET', '/v1/models')).rejects.toThrow(
				'This Chutes SSO credential cannot invoke models because it was granted only: openid profile',
			);
			expect(requestWithAuthentication).not.toHaveBeenCalled();
		});

		test('should reject SSO credentials with stored non-invoke scopes', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
			const context = createMockContext(
				{
					authType: 'sso',
					sessionToken: 'cak_scoped',
					grantedScopes: 'openid profile',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await expect(chutesApiRequest.call(context as any, 'GET', '/v1/models')).rejects.toThrow(
				'revoke the existing n8n authorization in your Chutes account settings',
			);
		});

		test('should wrap request errors in a NodeApiError', async () => {
			const requestWithAuthentication = jest.fn().mockRejectedValue({
				message: 'Forbidden - perhaps check your credentials?',
				description: 'Token does not have permission for this resource',
			});
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await expect(chutesApiRequest.call(context as any, 'GET', '/v1/models')).rejects.toThrow(
				'Chutes.ai API error: Forbidden - perhaps check your credentials?',
			);
		});
	});

	describe('chutesApiRequestWithRetry', () => {
		test('should retry on 429 responses and eventually succeed', async () => {
			jest.useFakeTimers();
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValueOnce({ statusCode: 429, message: 'rate limit' })
				.mockResolvedValueOnce({ ok: true });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			const promise = chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models');
			await jest.runOnlyPendingTimersAsync();
			const response = await promise;

			expect(response).toEqual({ ok: true });
			expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		test('should retry when NodeApiError exposes the rate limit via httpCode', async () => {
			jest.useFakeTimers();
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValueOnce({ httpCode: '429', message: 'rate limit' })
				.mockResolvedValueOnce({ ok: true });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			const promise = chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models');
			await jest.runOnlyPendingTimersAsync();
			const response = await promise;

			expect(response).toEqual({ ok: true });
			expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		test('should retry when NodeApiError exposes a numeric httpCode', async () => {
			jest.useFakeTimers();
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValueOnce(
					new NodeApiError({ name: 'Chutes' } as any, { httpCode: 429, message: 'rate limit' } as any, {
						message: 'wrapped rate limit',
					}),
				)
				.mockResolvedValueOnce({ ok: true });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			const promise = chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models');
			await jest.runOnlyPendingTimersAsync();
			const response = await promise;

			expect(response).toEqual({ ok: true });
			expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		test('should retry when the wrapped error exposes the rate limit via a string statusCode', async () => {
			jest.useFakeTimers();
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValueOnce({ statusCode: '429', message: 'rate limit' })
				.mockResolvedValueOnce({ ok: true });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			const promise = chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models');
			await jest.runOnlyPendingTimersAsync();
			const response = await promise;

			expect(response).toEqual({ ok: true });
			expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		test('should warn when the rate limit is low', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({
				headers: {
					'x-ratelimit-remaining': '3',
				},
			});
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models');

			expect(console.warn).toHaveBeenCalledWith('Low Chutes.ai rate limit: 3 requests remaining');
		});

		test('should not warn when the rate limit is still healthy', async () => {
			const requestWithAuthentication = jest.fn().mockResolvedValue({
				headers: {
					'x-ratelimit-remaining': '42',
				},
			});
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models');

			expect(console.warn).not.toHaveBeenCalled();
		});

		test('should throw immediately for non-429 errors', async () => {
			const requestWithAuthentication = jest.fn().mockRejectedValue({ statusCode: 500, message: 'boom' });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await expect(chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models')).rejects.toThrow(
				'Chutes.ai API error: boom',
			);
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should throw immediately when the wrapped error has a non-numeric status code', async () => {
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValue({ httpCode: 'wat', message: 'broken upstream' });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await expect(chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models')).rejects.toThrow(
				'Chutes.ai API error: broken upstream',
			);
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should throw immediately when the wrapped error has no HTTP status code', async () => {
			const requestWithAuthentication = jest.fn().mockRejectedValue(new Error('no status available'));
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			await expect(chutesApiRequestWithRetry.call(context as any, 'GET', '/v1/models')).rejects.toThrow(
				'Chutes.ai API error: no status available',
			);
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		test('should stop retrying after the maximum number of 429 responses', async () => {
			jest.useFakeTimers();
			const requestWithAuthentication = jest
				.fn()
				.mockRejectedValue({ statusCode: 429, message: 'rate limit' });
			const context = createMockContext(
				{
					apiKey: 'cpk_test',
					environment: 'production',
				},
				requestWithAuthentication,
			);

			const settled = chutesApiRequestWithRetry
				.call(context as any, 'GET', '/v1/models')
				.then(
					(value) => ({ value }),
					(error) => ({ error }),
				);
			for (let i = 0; i < 3; i += 1) {
				await jest.runOnlyPendingTimersAsync();
			}

			const result = await settled;
			expect(result).toHaveProperty('error');
			expect((result as { error: Error }).error.message).toContain('Chutes.ai API error: rate limit');
			expect(requestWithAuthentication).toHaveBeenCalledTimes(4);
		});
	});
});
