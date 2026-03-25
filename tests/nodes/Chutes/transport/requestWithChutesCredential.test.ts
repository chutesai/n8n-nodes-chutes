import { requestWithChutesCredential } from '../../../../nodes/Chutes/transport/requestWithChutesCredential';

describe('requestWithChutesCredential', () => {
	test('uses requestWithAuthentication when available', async () => {
		const mockContext = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ ok: true }),
			},
			getCredentials: jest.fn(),
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
		).rejects.toThrow('missing both an API key and a session token');
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
});
