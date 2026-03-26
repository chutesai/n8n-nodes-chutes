import {
	isOAuthClientConfigured,
	CHUTES_API_CREDENTIAL,
	CHUTES_OAUTH2_CREDENTIAL,
	getChutesAuthenticationProperty,
	getChutesCredentials,
	resolveCredentialType,
} from '../../../../nodes/Chutes/transport/credentialConfig';

describe('credentialConfig', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
		delete process.env.CHUTES_OAUTH_CLIENT_ID;
		delete process.env.CHUTES_OAUTH_CLIENT_SECRET;
		delete process.env.CHUTES_SERVER_ACCESS_TOKEN;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('constants', () => {
		test('CHUTES_API_CREDENTIAL should be chutesApi', () => {
			expect(CHUTES_API_CREDENTIAL).toBe('chutesApi');
		});

		test('CHUTES_OAUTH2_CREDENTIAL should be chutesOAuth2Api', () => {
			expect(CHUTES_OAUTH2_CREDENTIAL).toBe('chutesOAuth2Api');
		});
	});

	describe('isOAuthClientConfigured', () => {
		test('should return false when neither env var is set', () => {
			expect(isOAuthClientConfigured()).toBe(false);
		});

		test('should return false when only client ID is set', () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'some-id';
			expect(isOAuthClientConfigured()).toBe(false);
		});

		test('should return false when only client secret is set', () => {
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'some-secret';
			expect(isOAuthClientConfigured()).toBe(false);
		});

		test('should return true when both env vars are set', () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'some-id';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'some-secret';
			expect(isOAuthClientConfigured()).toBe(true);
		});

		test('should return false when env vars are empty strings', () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = '';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = '';
			expect(isOAuthClientConfigured()).toBe(false);
		});

		test('should return false when env vars are whitespace-only', () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = '   ';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = '   ';
			expect(isOAuthClientConfigured()).toBe(false);
		});
	});

	describe('getChutesAuthenticationProperty', () => {
		test('should return empty array when OAuth is not configured', () => {
			expect(getChutesAuthenticationProperty()).toEqual([]);
		});

		test('should return authentication dropdown when OAuth is configured', () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'cid';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'csec';
			const props = getChutesAuthenticationProperty();
			expect(props).toHaveLength(1);
			expect(props[0].name).toBe('authentication');
			expect(props[0].type).toBe('options');
			const options = props[0].options as Array<{ name: string; value: string }>;
			expect(options).toHaveLength(2);
			expect(options[0].value).toBe('apiKey');
			expect(options[1].value).toBe('oAuth2');
		});

		test('should return empty array when OAuth is configured but server access token is set', () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'cid';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'csec';
			process.env.CHUTES_SERVER_ACCESS_TOKEN = 'server-token';
			expect(getChutesAuthenticationProperty()).toEqual([]);
		});
	});

	describe('getChutesCredentials', () => {
		test('should return only chutesApi when OAuth is not configured', () => {
			const creds = getChutesCredentials();
			expect(creds).toHaveLength(1);
			expect(creds[0].name).toBe('chutesApi');
			expect(creds[0].required).toBe(true);
			expect(creds[0].displayOptions).toBeUndefined();
		});

		test('should return both credentials with displayOptions when OAuth is configured', () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'cid';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'csec';
			const creds = getChutesCredentials();
			expect(creds).toHaveLength(2);
			expect(creds[0].name).toBe('chutesApi');
			expect(creds[0].displayOptions).toEqual({
				show: { authentication: ['apiKey'] },
			});
			expect(creds[1].name).toBe('chutesOAuth2Api');
			expect(creds[1].displayOptions).toEqual({
				show: { authentication: ['oAuth2'] },
			});
		});

		test('should return only chutesApi when OAuth is configured but server access token is set', () => {
			process.env.CHUTES_OAUTH_CLIENT_ID = 'cid';
			process.env.CHUTES_OAUTH_CLIENT_SECRET = 'csec';
			process.env.CHUTES_SERVER_ACCESS_TOKEN = 'server-token';
			const creds = getChutesCredentials();
			expect(creds).toHaveLength(1);
			expect(creds[0].name).toBe('chutesApi');
			expect(creds[0].required).toBe(true);
			expect(creds[0].displayOptions).toBeUndefined();
		});
	});

	describe('resolveCredentialType', () => {
		test('should return chutesApi when authentication parameter is apiKey', () => {
			const context = {
				getNodeParameter: jest.fn().mockReturnValue('apiKey'),
			} as any;
			expect(resolveCredentialType(context)).toBe('chutesApi');
		});

		test('should return chutesOAuth2Api when authentication parameter is oAuth2', () => {
			const context = {
				getNodeParameter: jest.fn().mockReturnValue('oAuth2'),
			} as any;
			expect(resolveCredentialType(context)).toBe('chutesOAuth2Api');
		});

		test('should return chutesApi when authentication parameter is missing', () => {
			const context = {
				getNodeParameter: jest.fn().mockImplementation(() => {
					throw new Error('Parameter not found');
				}),
			} as any;
			expect(resolveCredentialType(context)).toBe('chutesApi');
		});

		test('should use getCurrentNodeParameter when getNodeParameter throws (loadOptions context)', () => {
			const context = {
				getNodeParameter: jest.fn().mockImplementation(() => {
					throw new Error('No item index in loadOptions');
				}),
				getCurrentNodeParameter: jest.fn().mockReturnValue('oAuth2'),
			} as any;
			expect(resolveCredentialType(context)).toBe('chutesOAuth2Api');
		});

		test('should return chutesApi via getCurrentNodeParameter when auth is apiKey in loadOptions', () => {
			const context = {
				getNodeParameter: jest.fn().mockImplementation(() => {
					throw new Error('No item index in loadOptions');
				}),
				getCurrentNodeParameter: jest.fn().mockReturnValue('apiKey'),
			} as any;
			expect(resolveCredentialType(context)).toBe('chutesApi');
		});

		test('should return chutesApi when both getNodeParameter and getCurrentNodeParameter throw', () => {
			const context = {
				getNodeParameter: jest.fn().mockImplementation(() => {
					throw new Error('No item index');
				}),
				getCurrentNodeParameter: jest.fn().mockImplementation(() => {
					throw new Error('Parameter not available');
				}),
			} as any;
			expect(resolveCredentialType(context)).toBe('chutesApi');
		});
	});
});
