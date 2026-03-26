import { requestWithChutesCredential } from '../../../../nodes/Chutes/transport/requestWithChutesCredential';

describe('requestWithChutesCredential', () => {
	test('uses requestWithAuthentication when available', async () => {
		const mockContext = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
		};

		const options = {
			method: 'GET' as const,
			url: 'https://api.chutes.ai/chutes/',
			headers: {
				'X-Test': '1',
			},
		};

		await requestWithChutesCredential(mockContext as any, options);

		expect(mockContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'chutesApi',
			expect.objectContaining({
				json: true,
				url: options.url,
				method: options.method,
				headers: expect.objectContaining({
					Accept: 'application/json',
					'X-Test': '1',
				}),
			}),
		);
		expect(mockContext.getCredentials).not.toHaveBeenCalled();
	});

	test('adds default Accept header when authenticated request has no headers', async () => {
		const mockContext = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn(),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(mockContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'chutesApi',
			expect.objectContaining({
				headers: {
					Accept: 'application/json',
				},
			}),
		);
	});

	test('uses chutesApi with access token metadata when available', async () => {
		const mockContext = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn().mockResolvedValue({ accessToken: 'oauth-access-token' }),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(mockContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'chutesApi',
			expect.objectContaining({
				headers: {
					Accept: 'application/json',
				},
			}),
		);
	});

	test('falls back to API key when requestWithAuthentication is unavailable', async () => {
		const mockContext = {
			helpers: {
				request: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(mockContext.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer test-api-key',
				}),
			}),
		);
	});

	test('falls back to session token when apiKey is missing', async () => {
		const mockContext = {
			helpers: {
				request: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn().mockResolvedValue({
				sessionToken: 'session-token',
			}),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(mockContext.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer session-token',
				}),
			}),
		);
	});

	test('falls back to OAuth access token when generic request is used', async () => {
		const mockContext = {
			helpers: {
				request: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn().mockResolvedValue({
				accessToken: 'oauth-access-token',
			}),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(mockContext.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer oauth-access-token',
				}),
			}),
		);
	});

	test('throws when both apiKey and sessionToken are missing', async () => {
		const mockContext = {
			helpers: {
				request: jest.fn(),
			},
			getCredentials: jest.fn().mockResolvedValue({}),
		};

		await expect(
			requestWithChutesCredential(mockContext as any, {
				method: 'GET',
				url: 'https://api.chutes.ai/chutes/',
			}),
		).rejects.toThrow('missing both an API key and an OAuth access token');
	});

	test('preserves explicit caller headers in fallback mode', async () => {
		const mockContext = {
			helpers: {
				request: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
			headers: {
				'X-Custom': 'abc',
			},
		});

		expect(mockContext.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer test-api-key',
					'X-Custom': 'abc',
				}),
			}),
		);
	});

	test('uses chutesOAuth2Api when authentication parameter is oAuth2', async () => {
		const mockContext = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn().mockReturnValue('oAuth2'),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(mockContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'chutesOAuth2Api',
			expect.objectContaining({
				json: true,
				url: 'https://api.chutes.ai/chutes/',
			}),
		);
	});

	test('uses chutesApi when authentication parameter is apiKey', async () => {
		const mockContext = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn().mockReturnValue('apiKey'),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(mockContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'chutesApi',
			expect.objectContaining({
				json: true,
			}),
		);
	});

	test('defaults to chutesApi when getNodeParameter is not available', async () => {
		const mockContext = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn(),
		};

		await requestWithChutesCredential(mockContext as any, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(mockContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'chutesApi',
			expect.objectContaining({
				json: true,
			}),
		);
	});

	test('throws credential error when chutesApi is unavailable', async () => {
		const mockContext = {
			helpers: {
				request: jest.fn(),
			},
			getCredentials: jest.fn().mockRejectedValue(new Error('missing chutesApi')),
		};

		await expect(
			requestWithChutesCredential(mockContext as any, {
				method: 'GET',
				url: 'https://api.chutes.ai/chutes/',
			}),
		).rejects.toThrow('missing chutesApi');
	});
});
