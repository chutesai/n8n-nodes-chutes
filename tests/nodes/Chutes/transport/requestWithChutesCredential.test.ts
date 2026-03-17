import { ILoadOptionsFunctions } from 'n8n-workflow';

import { requestWithChutesCredential } from '../../../../nodes/Chutes/transport/requestWithChutesCredential';

describe('requestWithChutesCredential', () => {
	it('should use n8n requestWithAuthentication when available', async () => {
		const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
		const context = {
			getCredentials: jest.fn(),
			helpers: {
				request: jest.fn(),
				requestWithAuthentication,
			},
		} as unknown as ILoadOptionsFunctions;

		const result = await requestWithChutesCredential(context, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(result).toEqual({ ok: true });
		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'chutesApi',
			expect.objectContaining({
				method: 'GET',
				url: 'https://api.chutes.ai/chutes/',
				headers: expect.objectContaining({
					Accept: 'application/json',
				}),
			}),
		);
		expect((context.helpers.request as jest.Mock)).not.toHaveBeenCalled();
	});

	it('should fall back to the API key when requestWithAuthentication is unavailable', async () => {
		const request = jest.fn().mockResolvedValue({ ok: true });
		const context = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			helpers: {
				request,
			},
		} as unknown as ILoadOptionsFunctions;

		await requestWithChutesCredential(context, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer test-api-key',
				}),
			}),
		);
	});

	it('should fall back to the session token when the credential is SSO-managed', async () => {
		const request = jest.fn().mockResolvedValue({ ok: true });
		const context = {
			getCredentials: jest.fn().mockResolvedValue({
				sessionToken: 'managed-session-token',
			}),
			helpers: {
				request,
			},
		} as unknown as ILoadOptionsFunctions;

		await requestWithChutesCredential(context, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
		});

		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer managed-session-token',
				}),
			}),
		);
	});

	it('should preserve explicit headers in the fallback request path', async () => {
		const request = jest.fn().mockResolvedValue({ ok: true });
		const context = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			helpers: {
				request,
			},
		} as unknown as ILoadOptionsFunctions;

		await requestWithChutesCredential(context, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
			headers: {
				'X-Custom': 'value',
			},
		});

		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer test-api-key',
					Accept: 'application/json',
					'X-Custom': 'value',
				}),
			}),
		);
	});

	it('should preserve explicit headers when using requestWithAuthentication', async () => {
		const requestWithAuthentication = jest.fn().mockResolvedValue({ ok: true });
		const context = {
			getCredentials: jest.fn(),
			helpers: {
				request: jest.fn(),
				requestWithAuthentication,
			},
		} as unknown as ILoadOptionsFunctions;

		await requestWithChutesCredential(context, {
			method: 'GET',
			url: 'https://api.chutes.ai/chutes/',
			headers: {
				'X-Custom': 'value',
			},
		});

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'chutesApi',
			expect.objectContaining({
				headers: expect.objectContaining({
					Accept: 'application/json',
					'X-Custom': 'value',
				}),
			}),
		);
	});

	it('should throw when fallback auth has neither an API key nor a session token', async () => {
		const request = jest.fn().mockResolvedValue({ ok: true });
		const context = {
			getCredentials: jest.fn().mockResolvedValue({}),
			helpers: {
				request,
			},
		} as unknown as ILoadOptionsFunctions;

		await expect(
			requestWithChutesCredential(context, {
				method: 'GET',
				url: 'https://api.chutes.ai/chutes/',
			}),
		).rejects.toThrow('Chutes credential is missing both an API key and a session token.');
		expect(request).not.toHaveBeenCalled();
	});
});
