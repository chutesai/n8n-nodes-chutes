import { IDataObject, ILoadOptionsFunctions, IRequestOptions } from 'n8n-workflow';

type AuthCapableContext = Pick<ILoadOptionsFunctions, 'helpers' | 'getCredentials'>;
type ChutesCredentialName = 'chutesApi' | 'chutesOAuth2Api';
const CHUTES_CREDENTIAL_CANDIDATES: ChutesCredentialName[] = ['chutesApi', 'chutesOAuth2Api'];

async function resolveCredential(
	context: AuthCapableContext,
): Promise<{ name: ChutesCredentialName; data: IDataObject }> {
	let lastError: unknown;

	for (const name of CHUTES_CREDENTIAL_CANDIDATES) {
		try {
			const data = (await context.getCredentials(name)) as IDataObject;
			return { name, data };
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError instanceof Error ? lastError : new Error('No Chutes credential is configured.');
}

function buildFallbackHeaders(credentials: IDataObject, headers: IDataObject): IDataObject {
	const bearerToken = String(credentials.apiKey || credentials.sessionToken || credentials.accessToken || '').trim();

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
	const credential = await resolveCredential(context);

	if (typeof authenticatedRequest === 'function') {
		return await authenticatedRequest.call(context, credential.name, {
			json: true,
			...requestOptions,
			headers: {
				Accept: 'application/json',
				...(requestOptions.headers ?? {}),
			},
		});
	}

	return await context.helpers.request({
		json: true,
		...requestOptions,
		headers: buildFallbackHeaders(credential.data, (requestOptions.headers ?? {}) as IDataObject),
	});
}
