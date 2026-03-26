import { IDataObject, ILoadOptionsFunctions, IRequestOptions } from 'n8n-workflow';

type AuthCapableContext = Pick<ILoadOptionsFunctions, 'helpers' | 'getCredentials'>;

function buildFallbackHeaders(credentials: IDataObject, headers: IDataObject): IDataObject {
	const bearerToken = String(
		credentials.apiKey || credentials.sessionToken || credentials.accessToken || '',
	).trim();

	if (!bearerToken) {
		throw new Error('Chutes credential is missing both an API key and an OAuth access token.');
	}

	return {
		Authorization: `Bearer ${bearerToken}`,
		Accept: 'application/json',
		...headers,
	};
}

export async function requestWithChutesCredential(
	context: AuthCapableContext,
	requestOptions: IRequestOptions,
): Promise<unknown> {
	const authenticatedRequest = (context.helpers as any).requestWithAuthentication;

	if (typeof authenticatedRequest === 'function') {
		return await authenticatedRequest.call(context, 'chutesApi', {
			json: true,
			...requestOptions,
			headers: {
				Accept: 'application/json',
				...(requestOptions.headers ?? {}),
			},
		});
	}

	const credential = (await context.getCredentials('chutesApi')) as IDataObject;
	return await context.helpers.request({
		json: true,
		...requestOptions,
		headers: buildFallbackHeaders(credential, (requestOptions.headers ?? {}) as IDataObject),
	});
}
