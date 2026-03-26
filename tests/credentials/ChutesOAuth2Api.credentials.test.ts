import { ChutesOAuth2Api } from '../../credentials/ChutesOAuth2Api.credentials';

describe('ChutesOAuth2Api Credentials', () => {
	let credentials: ChutesOAuth2Api;

	beforeEach(() => {
		credentials = new ChutesOAuth2Api();
	});

	test('should have correct credential identity', () => {
		expect(credentials.name).toBe('chutesOAuth2Api');
		expect(credentials.displayName).toBe('Sign in With Chutes');
	});

	test('should extend n8n base OAuth2 credential', () => {
		expect(credentials.extends).toEqual(['oAuth2Api']);
	});

	test('should configure hidden OAuth2 defaults for Chutes IDP', () => {
		const props = credentials.properties;
		const grantType = props.find((p: any) => p.name === 'grantType');
		const authUrl = props.find((p: any) => p.name === 'authUrl');
		const accessTokenUrl = props.find((p: any) => p.name === 'accessTokenUrl');
		const scope = props.find((p: any) => p.name === 'scope');
		const authentication = props.find((p: any) => p.name === 'authentication');

		expect(grantType?.default).toBe('authorizationCode');
		expect(authUrl?.default).toContain('/idp/authorize');
		expect(accessTokenUrl?.default).toContain('/idp/token');
		expect(scope?.default).toContain('chutes:invoke');
		expect(authentication?.default).toBe('body');
	});

	test('should include environment and custom url fields for chute routing', () => {
		const envProperty = credentials.properties.find((p: any) => p.name === 'environment');
		const customUrlProperty = credentials.properties.find((p: any) => p.name === 'customUrl');

		expect(envProperty?.type).toBe('options');
		expect(customUrlProperty?.type).toBe('string');
	});
});
