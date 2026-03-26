import { ChutesOAuth2Api } from '../../credentials/ChutesOAuth2Api.credentials';

describe('ChutesOAuth2Api Credentials', () => {
	let credentials: ChutesOAuth2Api;

	beforeEach(() => {
		credentials = new ChutesOAuth2Api();
	});

	describe('Basic Properties', () => {
		test('should have correct credential name', () => {
			expect(credentials.name).toBe('chutesOAuth2Api');
		});

		test('should have correct display name', () => {
			expect(credentials.displayName).toBe('Sign in With Chutes');
		});

		test('should have documentation URL', () => {
			expect(credentials.documentationUrl).toBe('https://chutes.ai/docs');
		});

		test('should use the Chutes logo icon', () => {
			expect((credentials as any).icon).toContain('chutes');
		});

		test('should extend oAuth2Api', () => {
			expect(credentials.extends).toEqual(['oAuth2Api']);
		});
	});

	describe('OAuth Properties', () => {
		test('should have hidden grantType set to authorizationCode', () => {
			const field = credentials.properties.find((p) => p.name === 'grantType');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
			expect(field?.default).toBe('authorizationCode');
		});

		test('should have hidden authUrl derived from env', () => {
			const field = credentials.properties.find((p) => p.name === 'authUrl');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
		});

		test('should have hidden accessTokenUrl derived from env', () => {
			const field = credentials.properties.find((p) => p.name === 'accessTokenUrl');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
		});

		test('should have hidden clientId derived from env', () => {
			const field = credentials.properties.find((p) => p.name === 'clientId');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
			expect(String(field?.default)).toContain('CHUTES_OAUTH_CLIENT_ID');
		});

		test('should have hidden clientSecret derived from env', () => {
			const field = credentials.properties.find((p) => p.name === 'clientSecret');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
		});

		test('should have hidden scope with openid profile chutes:invoke', () => {
			const field = credentials.properties.find((p) => p.name === 'scope');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
			expect(field?.default).toBe('openid profile chutes:invoke');
		});

		test('should have hidden authentication set to body', () => {
			const field = credentials.properties.find((p) => p.name === 'authentication');
			expect(field).toBeDefined();
			expect(field?.type).toBe('hidden');
			expect(field?.default).toBe('body');
		});
	});

	describe('User-Facing Properties', () => {
		test('should have environment selection', () => {
			const field = credentials.properties.find((p) => p.name === 'environment');
			expect(field).toBeDefined();
			expect(field?.type).toBe('options');
			expect(field?.default).toBe('production');
		});

		test('should have a connect notice', () => {
			const notice = credentials.properties.find((p) => p.type === 'notice');
			expect(notice).toBeDefined();
			expect(notice?.displayName).toContain('Connect my account');
		});
	});

	describe('Authentication', () => {
		test('should use generic authentication type', () => {
			expect(credentials.authenticate).toBeDefined();
			expect(credentials.authenticate?.type).toBe('generic');
		});

		test('should include Authorization header', () => {
			const headers = credentials.authenticate?.properties?.headers as any;
			expect(headers).toHaveProperty('Authorization');
			expect(headers.Authorization).toContain('Bearer');
		});

		test('should include X-Chutes-Client header', () => {
			const headers = credentials.authenticate?.properties?.headers as any;
			expect(headers['X-Chutes-Client']).toBe('n8n-integration');
		});
	});

	describe('Credential Testing', () => {
		test('should have test configuration', () => {
			expect(credentials.test).toBeDefined();
			expect(credentials.test?.request).toBeDefined();
		});

		test('should test with /v1/models endpoint', () => {
			expect(credentials.test?.request.url).toBe('/v1/models');
		});

		test('should use CHUTES_CREDENTIAL_TEST_BASE_URL when set', () => {
			const original = process.env.CHUTES_CREDENTIAL_TEST_BASE_URL;
			process.env.CHUTES_CREDENTIAL_TEST_BASE_URL = 'https://custom-test.chutes.ai';
			try {
				const creds = new ChutesOAuth2Api();
				expect(creds.test?.request.baseURL).toBe('https://custom-test.chutes.ai');
			} finally {
				if (original === undefined) {
					delete process.env.CHUTES_CREDENTIAL_TEST_BASE_URL;
				} else {
					process.env.CHUTES_CREDENTIAL_TEST_BASE_URL = original;
				}
			}
		});
	});

	describe('Environment Variable Overrides', () => {
		test('should use CHUTES_IDP_BASE_URL when set for authUrl and accessTokenUrl', () => {
			const original = process.env.CHUTES_IDP_BASE_URL;
			process.env.CHUTES_IDP_BASE_URL = 'https://custom-idp.chutes.ai/';
			try {
				const creds = new ChutesOAuth2Api();
				const authUrl = creds.properties.find((p) => p.name === 'authUrl');
				const accessTokenUrl = creds.properties.find((p) => p.name === 'accessTokenUrl');
				expect(authUrl?.default).toBe('https://custom-idp.chutes.ai/idp/authorize');
				expect(accessTokenUrl?.default).toBe('https://custom-idp.chutes.ai/idp/token');
			} finally {
				if (original === undefined) {
					delete process.env.CHUTES_IDP_BASE_URL;
				} else {
					process.env.CHUTES_IDP_BASE_URL = original;
				}
			}
		});
	});
});
