import { IDataObject, ILoadOptionsFunctions } from 'n8n-workflow';

type AuthenticatedRequest = (
	credentialType: string,
	requestOptions: IDataObject,
) => Promise<unknown>;

function buildFallbackHeaders(
	credentials: IDataObject,
	headers: IDataObject,
): IDataObject {
	const bearerToken = String(credentials.apiKey || credentials.sessionToken || '').trim();
	if (!bearerToken) {
		throw new Error('Chutes credential is missing both an API key and a session token.');
	}

	return {
		Authorization: `Bearer ${bearerToken}`,
		Accept: 'application/json',
		...headers,
	};
}

export async function requestWithChutesCredential(
	context: ILoadOptionsFunctions,
	requestOptions: IDataObject,
): Promise<any> {
	const authenticatedRequest = (context.helpers as { requestWithAuthentication?: AuthenticatedRequest })
		.requestWithAuthentication;

	if (typeof authenticatedRequest === 'function') {
		return await authenticatedRequest.call(context, 'chutesApi', {
			json: true,
			...requestOptions,
			headers: {
				Accept: 'application/json',
				...((requestOptions.headers as IDataObject | undefined) ?? {}),
			},
		});
	}

	const credentials = await context.getCredentials('chutesApi');
	return await context.helpers.request({
		json: true,
		...requestOptions,
		headers: buildFallbackHeaders(
			credentials as IDataObject,
			(requestOptions.headers as IDataObject | undefined) ?? {},
		),
	});
}
