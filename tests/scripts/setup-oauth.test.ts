import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('setup-oauth CLI', () => {
	describe('package.json configuration', () => {
		const pkg = JSON.parse(
			fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'),
		);

		test('should have a bin entry for n8n-nodes-chutes-setup-oauth', () => {
			expect(pkg.bin).toBeDefined();
			expect(pkg.bin['n8n-nodes-chutes-setup-oauth']).toBe('./dist/scripts/cli-entry.js');
		});

		test('should include dist/scripts in the files array', () => {
			expect(pkg.files).toContain('dist');
		});
	});

	describe('tsconfig.json configuration', () => {
		const tsconfig = JSON.parse(
			fs.readFileSync(path.resolve(__dirname, '../../tsconfig.json'), 'utf-8'),
		);

		test('should include scripts/**/* in the include array', () => {
			expect(tsconfig.include).toContain('scripts/**/*');
		});
	});

	describe('jest.config.js coverage configuration', () => {
		const jestConfig = require('../../jest.config.js');

		test('should include scripts/**/*.ts in collectCoverageFrom', () => {
			expect(jestConfig.collectCoverageFrom).toContain('scripts/**/*.ts');
		});
	});

	describe('coverage gate script', () => {
		const gateScript = fs.readFileSync(
			path.resolve(__dirname, '../../scripts/check-runtime-surface-coverage.js'),
			'utf-8',
		);

		test('should check scripts/ directory in coverage gate', () => {
			expect(gateScript).toContain("'scripts/'");
		});
	});

	describe('module exports', () => {
		const mod = require('../../scripts/setup-oauth');

		test('should export verifyApiKey function', () => {
			expect(typeof mod.verifyApiKey).toBe('function');
		});

		test('should export registerOAuthApp function', () => {
			expect(typeof mod.registerOAuthApp).toBe('function');
		});

		test('should export generatePKCE function', () => {
			expect(typeof mod.generatePKCE).toBe('function');
		});

		test('should export writeEnvFile function', () => {
			expect(typeof mod.writeEnvFile).toBe('function');
		});

		test('should export formatEnvOutput function', () => {
			expect(typeof mod.formatEnvOutput).toBe('function');
		});

		test('should export buildAuthorizationUrl function', () => {
			expect(typeof mod.buildAuthorizationUrl).toBe('function');
		});

		test('should export exchangeCodeForTokens function', () => {
			expect(typeof mod.exchangeCodeForTokens).toBe('function');
		});

		test('should export DEFAULT_REDIRECT_URI constant', () => {
			expect(mod.DEFAULT_REDIRECT_URI).toBe(
				'http://localhost:5678/rest/oauth2-credential/callback',
			);
		});

		test('should export DEFAULT_SCOPES constant', () => {
			expect(mod.DEFAULT_SCOPES).toEqual(['openid', 'profile', 'chutes:invoke']);
		});

		test('should export CHUTES_API_URL constant', () => {
			expect(mod.CHUTES_API_URL).toBe('https://api.chutes.ai');
		});

		test('should export runSetup function', () => {
			expect(typeof mod.runSetup).toBe('function');
		});

		test('should export main function', () => {
			expect(typeof mod.main).toBe('function');
		});
	});

	describe('verifyApiKey', () => {
		const { verifyApiKey } = require('../../scripts/setup-oauth');

		beforeEach(() => {
			jest.restoreAllMocks();
		});

		test('should return true when API returns 200', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: true,
			} as Response);

			const result = await verifyApiKey('cpat_valid_key');
			expect(result).toBe(true);
		});

		test('should return false when API returns non-200', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 401,
			} as Response);

			const result = await verifyApiKey('cpat_invalid_key');
			expect(result).toBe(false);
		});

		test('should return false when fetch throws', async () => {
			jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

			const result = await verifyApiKey('cpat_any_key');
			expect(result).toBe(false);
		});

		test('should call /users/me with Bearer authorization', async () => {
			const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: true,
			} as Response);

			await verifyApiKey('cpat_test_key');

			expect(fetchSpy).toHaveBeenCalledWith('https://api.chutes.ai/users/me', {
				headers: { Authorization: 'Bearer cpat_test_key' },
			});
		});
	});

	describe('registerOAuthApp', () => {
		const { registerOAuthApp } = require('../../scripts/setup-oauth');

		beforeEach(() => {
			jest.restoreAllMocks();
		});

		test('should call POST /idp/apps with correct payload', async () => {
			const mockResponse = {
				app_id: 'app_123',
				client_id: 'cid_abc',
				client_secret: 'csc_xyz',
			};
			const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			await registerOAuthApp({
				apiKey: 'cpat_key',
				name: 'My n8n Instance',
				redirectUris: ['http://localhost:5678/rest/oauth2-credential/callback'],
				scopes: ['openid', 'profile', 'chutes:invoke'],
			});

			expect(fetchSpy).toHaveBeenCalledWith('https://api.chutes.ai/idp/apps', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer cpat_key',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: 'My n8n Instance',
					description: 'OAuth app for n8n Chutes integration',
					redirect_uris: ['http://localhost:5678/rest/oauth2-credential/callback'],
					allowed_scopes: ['openid', 'profile', 'chutes:invoke'],
				}),
			});
		});

		test('should return client_id, client_secret, and app_id on success', async () => {
			const mockResponse = {
				app_id: 'app_123',
				client_id: 'cid_abc',
				client_secret: 'csc_xyz',
			};
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await registerOAuthApp({
				apiKey: 'cpat_key',
				name: 'Test',
				redirectUris: ['http://localhost:5678/rest/oauth2-credential/callback'],
				scopes: ['openid'],
			});

			expect(result).toEqual(mockResponse);
		});

		test('should throw on API error with detail message', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ detail: 'Invalid redirect URI' }),
			} as unknown as Response);

			await expect(
				registerOAuthApp({
					apiKey: 'cpat_key',
					name: 'Test',
					redirectUris: ['bad-uri'],
					scopes: ['openid'],
				}),
			).rejects.toThrow('Invalid redirect URI');
		});

		test('should throw with HTTP status when no detail in error', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({}),
			} as unknown as Response);

			await expect(
				registerOAuthApp({
					apiKey: 'cpat_key',
					name: 'Test',
					redirectUris: ['http://localhost:5678/rest/oauth2-credential/callback'],
					scopes: ['openid'],
				}),
			).rejects.toThrow('HTTP 500');
		});

		test('should throw with message when detail is absent but message is present', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 422,
				json: async () => ({ message: 'Validation failed' }),
			} as unknown as Response);

			await expect(
				registerOAuthApp({
					apiKey: 'cpat_key',
					name: 'Test',
					redirectUris: ['http://localhost:5678/rest/oauth2-credential/callback'],
					scopes: ['openid'],
				}),
			).rejects.toThrow('Validation failed');
		});

		test('should throw with HTTP status when json parsing fails', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 502,
				json: async () => {
					throw new Error('invalid json');
				},
			} as unknown as Response);

			await expect(
				registerOAuthApp({
					apiKey: 'cpat_key',
					name: 'Test',
					redirectUris: ['http://localhost:5678/rest/oauth2-credential/callback'],
					scopes: ['openid'],
				}),
			).rejects.toThrow('HTTP 502');
		});
	});

	describe('generatePKCE', () => {
		const { generatePKCE } = require('../../scripts/setup-oauth');

		test('should return codeVerifier and codeChallenge', async () => {
			const result = await generatePKCE();
			expect(result).toHaveProperty('codeVerifier');
			expect(result).toHaveProperty('codeChallenge');
		});

		test('codeVerifier should be 43-128 characters of URL-safe base64', async () => {
			const result = await generatePKCE();
			expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
			expect(result.codeVerifier.length).toBeLessThanOrEqual(128);
			expect(result.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		test('codeChallenge should be URL-safe base64 (S256)', async () => {
			const result = await generatePKCE();
			expect(result.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		test('should generate different values each time', async () => {
			const a = await generatePKCE();
			const b = await generatePKCE();
			expect(a.codeVerifier).not.toBe(b.codeVerifier);
			expect(a.codeChallenge).not.toBe(b.codeChallenge);
		});
	});

	describe('formatEnvOutput', () => {
		const { formatEnvOutput } = require('../../scripts/setup-oauth');

		test('should format vars as KEY=VALUE lines', () => {
			const output = formatEnvOutput({
				CHUTES_OAUTH_CLIENT_ID: 'cid_abc',
				CHUTES_OAUTH_CLIENT_SECRET: 'csc_xyz',
			});
			expect(output).toContain('CHUTES_OAUTH_CLIENT_ID=cid_abc');
			expect(output).toContain('CHUTES_OAUTH_CLIENT_SECRET=csc_xyz');
		});

		test('should separate entries with newlines', () => {
			const output = formatEnvOutput({
				A: '1',
				B: '2',
			});
			const lines = output.trim().split('\n');
			expect(lines.length).toBe(2);
		});
	});

	describe('writeEnvFile', () => {
		const { writeEnvFile } = require('../../scripts/setup-oauth');
		let tmpDir: string;

		beforeEach(() => {
			tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-oauth-test-'));
		});

		afterEach(() => {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		});

		test('should create a new .env file if it does not exist', () => {
			const envPath = path.join(tmpDir, '.env');
			const result = writeEnvFile(envPath, {
				CHUTES_OAUTH_CLIENT_ID: 'cid_abc',
				CHUTES_OAUTH_CLIENT_SECRET: 'csc_xyz',
			});

			expect(fs.existsSync(envPath)).toBe(true);
			const content = fs.readFileSync(envPath, 'utf-8');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_ID=cid_abc');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_SECRET=csc_xyz');
			expect(result.written).toEqual(['CHUTES_OAUTH_CLIENT_ID', 'CHUTES_OAUTH_CLIENT_SECRET']);
			expect(result.skipped).toEqual([]);
		});

		test('should append to existing .env file', () => {
			const envPath = path.join(tmpDir, '.env');
			fs.writeFileSync(envPath, 'EXISTING_VAR=hello\n');

			writeEnvFile(envPath, { CHUTES_OAUTH_CLIENT_ID: 'cid_abc' });

			const content = fs.readFileSync(envPath, 'utf-8');
			expect(content).toContain('EXISTING_VAR=hello');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_ID=cid_abc');
		});

		test('should skip keys that already exist in the file', () => {
			const envPath = path.join(tmpDir, '.env');
			fs.writeFileSync(envPath, 'CHUTES_OAUTH_CLIENT_ID=old_value\n');

			const result = writeEnvFile(envPath, {
				CHUTES_OAUTH_CLIENT_ID: 'new_value',
				CHUTES_OAUTH_CLIENT_SECRET: 'csc_xyz',
			});

			const content = fs.readFileSync(envPath, 'utf-8');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_ID=old_value');
			expect(content).not.toContain('CHUTES_OAUTH_CLIENT_ID=new_value');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_SECRET=csc_xyz');
			expect(result.written).toEqual(['CHUTES_OAUTH_CLIENT_SECRET']);
			expect(result.skipped).toEqual(['CHUTES_OAUTH_CLIENT_ID']);
		});

		test('should handle empty vars object', () => {
			const envPath = path.join(tmpDir, '.env');
			const result = writeEnvFile(envPath, {});
			expect(result.written).toEqual([]);
			expect(result.skipped).toEqual([]);
		});

		test('should skip all keys when all already exist in file', () => {
			const envPath = path.join(tmpDir, '.env');
			fs.writeFileSync(envPath, 'KEY_A=old_a\nKEY_B=old_b\n');

			const result = writeEnvFile(envPath, { KEY_A: 'new_a', KEY_B: 'new_b' });
			expect(result.written).toEqual([]);
			expect(result.skipped).toEqual(['KEY_A', 'KEY_B']);

			const content = fs.readFileSync(envPath, 'utf-8');
			expect(content).toBe('KEY_A=old_a\nKEY_B=old_b\n');
		});

		test('should prepend newline when existing file lacks trailing newline', () => {
			const envPath = path.join(tmpDir, '.env');
			fs.writeFileSync(envPath, 'EXISTING=value');

			writeEnvFile(envPath, { NEW_KEY: 'new_val' });

			const content = fs.readFileSync(envPath, 'utf-8');
			expect(content).toBe('EXISTING=value\nNEW_KEY=new_val\n');
		});
	});

	describe('buildAuthorizationUrl', () => {
		const { buildAuthorizationUrl } = require('../../scripts/setup-oauth');

		test('should build URL with all required parameters', () => {
			const url = buildAuthorizationUrl({
				clientId: 'cid_abc',
				redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				scopes: ['openid', 'profile', 'chutes:invoke'],
				state: 'random_state',
				codeChallenge: 'challenge_value',
			});

			const parsed = new URL(url);
			expect(parsed.origin).toBe('https://api.chutes.ai');
			expect(parsed.pathname).toBe('/idp/authorize');
			expect(parsed.searchParams.get('client_id')).toBe('cid_abc');
			expect(parsed.searchParams.get('redirect_uri')).toBe(
				'http://localhost:5678/rest/oauth2-credential/callback',
			);
			expect(parsed.searchParams.get('response_type')).toBe('code');
			expect(parsed.searchParams.get('scope')).toBe('openid profile chutes:invoke');
			expect(parsed.searchParams.get('state')).toBe('random_state');
			expect(parsed.searchParams.get('code_challenge')).toBe('challenge_value');
			expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
		});
	});

	describe('exchangeCodeForTokens', () => {
		const { exchangeCodeForTokens } = require('../../scripts/setup-oauth');

		beforeEach(() => {
			jest.restoreAllMocks();
		});

		test('should POST to /idp/token with correct form data', async () => {
			const mockTokens = {
				access_token: 'at_123',
				refresh_token: 'rt_456',
				token_type: 'Bearer',
				expires_in: 3600,
			};
			const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: true,
				json: async () => mockTokens,
			} as Response);

			await exchangeCodeForTokens({
				clientId: 'cid_abc',
				clientSecret: 'csc_xyz',
				code: 'auth_code_123',
				redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				codeVerifier: 'verifier_value',
			});

			expect(fetchSpy).toHaveBeenCalledTimes(1);
			const [url, options] = fetchSpy.mock.calls[0] as [string, any];
			expect(url).toBe('https://api.chutes.ai/idp/token');
			expect(options.method).toBe('POST');
			expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

			const body = new URLSearchParams(options.body as string);
			expect(body.get('grant_type')).toBe('authorization_code');
			expect(body.get('client_id')).toBe('cid_abc');
			expect(body.get('client_secret')).toBe('csc_xyz');
			expect(body.get('code')).toBe('auth_code_123');
			expect(body.get('redirect_uri')).toBe(
				'http://localhost:5678/rest/oauth2-credential/callback',
			);
			expect(body.get('code_verifier')).toBe('verifier_value');
		});

		test('should return tokens on success', async () => {
			const mockTokens = {
				access_token: 'at_123',
				refresh_token: 'rt_456',
				token_type: 'Bearer',
				expires_in: 3600,
			};
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: true,
				json: async () => mockTokens,
			} as Response);

			const result = await exchangeCodeForTokens({
				clientId: 'cid_abc',
				clientSecret: 'csc_xyz',
				code: 'auth_code_123',
				redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				codeVerifier: 'verifier_value',
			});

			expect(result.access_token).toBe('at_123');
			expect(result.refresh_token).toBe('rt_456');
		});

		test('should throw on error response', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ error: 'invalid_grant', error_description: 'Code expired' }),
			} as unknown as Response);

			await expect(
				exchangeCodeForTokens({
					clientId: 'cid_abc',
					clientSecret: 'csc_xyz',
					code: 'expired_code',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
					codeVerifier: 'verifier_value',
				}),
			).rejects.toThrow('Code expired');
		});

		test('should throw generic message when error response has no description', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({}),
			} as unknown as Response);

			await expect(
				exchangeCodeForTokens({
					clientId: 'cid_abc',
					clientSecret: 'csc_xyz',
					code: 'code',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
					codeVerifier: 'verifier_value',
				}),
			).rejects.toThrow('HTTP 500');
		});

		test('should throw with HTTP status when json parsing fails', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 502,
				json: async () => {
					throw new Error('invalid json');
				},
			} as unknown as Response);

			await expect(
				exchangeCodeForTokens({
					clientId: 'cid_abc',
					clientSecret: 'csc_xyz',
					code: 'code',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
					codeVerifier: 'verifier_value',
				}),
			).rejects.toThrow('HTTP 502');
		});

		test('should throw with detail when error_description is absent but detail is present', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ detail: 'Token revoked' }),
			} as unknown as Response);

			await expect(
				exchangeCodeForTokens({
					clientId: 'cid_abc',
					clientSecret: 'csc_xyz',
					code: 'code',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
					codeVerifier: 'verifier_value',
				}),
			).rejects.toThrow('Token revoked');
		});
	});

	describe('runSetup (main orchestration)', () => {
		const {
			runSetup,
			verifyApiKey: _verifyApiKey,
			registerOAuthApp: _registerOAuthApp,
		} = require('../../scripts/setup-oauth');

		let tmpDir: string;
		const originalConsoleLog = console.log;
		const originalConsoleError = console.error;
		let logs: string[];

		beforeEach(() => {
			jest.restoreAllMocks();
			tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-oauth-main-'));
			logs = [];
			console.log = (...args: any[]) => logs.push(args.join(' '));
			console.error = (...args: any[]) => logs.push(args.join(' '));
		});

		afterEach(() => {
			console.log = originalConsoleLog;
			console.error = originalConsoleError;
			fs.rmSync(tmpDir, { recursive: true, force: true });
		});

		test('should export runSetup function', () => {
			expect(typeof runSetup).toBe('function');
		});

		test('multi-user mode: should register app and return env vars', async () => {
			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_test',
						client_secret: 'csc_test',
					}),
				} as Response);

			const envPath = path.join(tmpDir, '.env');
			const result = await runSetup({
				apiKey: 'cpat_test',
				mode: 'multi-user',
				redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				envFilePath: envPath,
				writeToFile: true,
			});

			expect(result.clientId).toBe('cid_test');
			expect(result.clientSecret).toBe('csc_test');

			const content = fs.readFileSync(envPath, 'utf-8');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_ID=cid_test');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_SECRET=csc_test');
		});

		test('should throw if API key verification fails', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 401,
			} as Response);

			await expect(
				runSetup({
					apiKey: 'bad_key',
					mode: 'multi-user',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
					envFilePath: path.join(tmpDir, '.env'),
					writeToFile: true,
				}),
			).rejects.toThrow('Invalid API key');
		});

		test('should not write to file when writeToFile is false', async () => {
			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_test',
						client_secret: 'csc_test',
					}),
				} as Response);

			const envPath = path.join(tmpDir, '.env');
			const result = await runSetup({
				apiKey: 'cpat_test',
				mode: 'multi-user',
				redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				envFilePath: envPath,
				writeToFile: false,
			});

			expect(result.clientId).toBe('cid_test');
			expect(fs.existsSync(envPath)).toBe(false);
		});

		test('should use default scopes when registering', async () => {
			const fetchSpy = jest
				.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_test',
						client_secret: 'csc_test',
					}),
				} as Response);

			const envPath = path.join(tmpDir, '.env');
			await runSetup({
				apiKey: 'cpat_test',
				mode: 'multi-user',
				redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				envFilePath: envPath,
				writeToFile: false,
			});

			const [, registerOptions] = fetchSpy.mock.calls[1] as [string, any];
			const body = JSON.parse(registerOptions.body);
			expect(body.allowed_scopes).toEqual(['openid', 'profile', 'chutes:invoke']);
		});

		test('single-account mode: should throw when authCode is missing', async () => {
			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_test',
						client_secret: 'csc_test',
					}),
				} as Response);

			await expect(
				runSetup({
					apiKey: 'cpat_test',
					mode: 'single-account',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
					envFilePath: path.join(tmpDir, '.env'),
					writeToFile: true,
				}),
			).rejects.toThrow('authCode and codeVerifier are required');
		});

		test('single-account mode: should register app and exchange tokens', async () => {
			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_test',
						client_secret: 'csc_test',
					}),
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: 'at_999',
						refresh_token: 'rt_888',
						token_type: 'Bearer',
						expires_in: 3600,
					}),
				} as Response);

			const envPath = path.join(tmpDir, '.env');
			const result = await runSetup({
				apiKey: 'cpat_test',
				mode: 'single-account',
				redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				envFilePath: envPath,
				writeToFile: true,
				authCode: 'manual_code_123',
				codeVerifier: 'manual_verifier',
			});

			expect(result.clientId).toBe('cid_test');
			expect(result.accessToken).toBe('at_999');
			expect(result.refreshToken).toBe('rt_888');

			const content = fs.readFileSync(envPath, 'utf-8');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_ID=cid_test');
			expect(content).toContain('CHUTES_OAUTH_CLIENT_SECRET=csc_test');
			expect(content).toContain('CHUTES_SERVER_ACCESS_TOKEN=at_999');
			expect(content).toContain('CHUTES_SERVER_REFRESH_TOKEN=rt_888');
		});
	});

	describe('main() interactive CLI', () => {
		const setupOAuth = require('../../scripts/setup-oauth');
		const { main } = setupOAuth;
		let exitSpy: jest.SpyInstance;
		let logSpy: jest.SpyInstance;
		let errorSpy: jest.SpyInstance;

		function mockReadline(answers: string[]) {
			let callIndex = 0;
			const closeFn = jest.fn();
			const questionFn = jest.fn((_q: string, cb: (a: string) => void) => {
				cb(answers[callIndex++] || '');
			});
			jest.spyOn(require('readline'), 'createInterface').mockReturnValue({
				question: questionFn,
				close: closeFn,
			} as any);
			return { questionFn, closeFn };
		}

		beforeEach(() => {
			jest.restoreAllMocks();
			exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
				throw new Error('process.exit called');
			}) as any);
			logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
			errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		test('should exit with error when API key is empty', async () => {
			mockReadline(['']);

			await expect(main()).rejects.toThrow('process.exit called');
			expect(errorSpy).toHaveBeenCalledWith('API key is required.');
			expect(exitSpy).toHaveBeenCalledWith(1);
		});

		test('should exit with error when API key is invalid', async () => {
			mockReadline(['cpat_bad_key']);
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 401,
			} as Response);

			await expect(main()).rejects.toThrow('process.exit called');
			expect(errorSpy).toHaveBeenCalledWith(
				'Invalid API key. Please check and try again.',
			);
			expect(exitSpy).toHaveBeenCalledWith(1);
		});

		test('should run multi-user flow with default redirect and write to default .env', async () => {
			const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'main-test-'));
			const envPath = path.join(tmpDir, '.env');

			mockReadline([
				'cpat_valid',
				'1',
				'',
				'Y',
				envPath,
			]);

			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_main',
						client_secret: 'csc_main',
					}),
				} as Response);

			await main();
			expect(exitSpy).not.toHaveBeenCalled();

			fs.rmSync(tmpDir, { recursive: true, force: true });
		});

		test('should print env vars to screen when user declines writing to file', async () => {
			mockReadline([
				'cpat_valid',
				'1',
				'',
				'n',
			]);

			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_screen',
						client_secret: 'csc_screen',
					}),
				} as Response);

			await main();
			expect(logSpy).toHaveBeenCalledWith(
				expect.stringContaining('Add these to your environment'),
			);
		});

		test('should use custom redirect URI when provided', async () => {
			mockReadline([
				'cpat_valid',
				'1',
				'https://myhost.com/rest/oauth2-credential/callback',
				'n',
			]);

			const fetchSpy = jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_custom',
						client_secret: 'csc_custom',
					}),
				} as Response);

			await main();

			const registerCall = fetchSpy.mock.calls[2];
			const body = JSON.parse((registerCall[1] as any).body);
			expect(body.redirect_uris).toContain(
				'https://myhost.com/rest/oauth2-credential/callback',
			);
		});

		test('should exit with error when auth code is empty in single-account mode', async () => {
			mockReadline([
				'cpat_valid',
				'2',
				'',
				'',
			]);

			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: true,
			} as Response);

			await expect(main()).rejects.toThrow('process.exit called');
			expect(errorSpy).toHaveBeenCalledWith(
				'Authorization code is required for single-account mode.',
			);
		});

		test('should run single-account flow with tokens and write to file', async () => {
			const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'main-sa-'));
			const envPath = path.join(tmpDir, '.env');

			mockReadline([
				'cpat_valid',
				'2',
				'',
				'auth_code_123',
				'Y',
				envPath,
			]);

			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_sa',
						client_secret: 'csc_sa',
					}),
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: 'at_main',
						refresh_token: 'rt_main',
						token_type: 'Bearer',
						expires_in: 3600,
					}),
				} as Response);

			await main();

			const content = fs.readFileSync(envPath, 'utf-8');
			expect(content).toContain('CHUTES_SERVER_ACCESS_TOKEN=at_main');
			expect(content).toContain('CHUTES_SERVER_REFRESH_TOKEN=rt_main');

			fs.rmSync(tmpDir, { recursive: true, force: true });
		});

		test('should handle setup failure and exit', async () => {
			mockReadline([
				'cpat_valid',
				'1',
				'',
			]);

			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: false,
					status: 403,
					json: async () => ({}),
				} as unknown as Response);

			await expect(main()).rejects.toThrow('process.exit called');
			expect(errorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Setup failed'),
			);
		});

		test('should handle non-Error thrown in setup', async () => {
			mockReadline([
				'cpat_valid',
				'1',
				'',
			]);

			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockRejectedValueOnce('string error');

			await expect(main()).rejects.toThrow('process.exit called');
			expect(errorSpy).toHaveBeenCalledWith(
				expect.stringContaining('string error'),
			);
		});

		test('should show written and skipped keys', async () => {
			const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'main-skip-'));
			const envPath = path.join(tmpDir, '.env');
			fs.writeFileSync(envPath, 'CHUTES_OAUTH_CLIENT_ID=existing\n');

			mockReadline([
				'cpat_valid',
				'1',
				'',
				'Y',
				envPath,
			]);

			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_skip',
						client_secret: 'csc_skip',
					}),
				} as Response);

			await main();

			expect(logSpy).toHaveBeenCalledWith(
				expect.stringContaining('Skipped'),
			);
			expect(logSpy).toHaveBeenCalledWith(
				expect.stringContaining('Written to'),
			);

			fs.rmSync(tmpDir, { recursive: true, force: true });
		});

		test('should handle write with all keys already existing', async () => {
			const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'main-allskip-'));
			const envPath = path.join(tmpDir2, '.env');
			fs.writeFileSync(
				envPath,
				'CHUTES_OAUTH_CLIENT_ID=existing\nCHUTES_OAUTH_CLIENT_SECRET=existing\n',
			);

			mockReadline([
				'cpat_valid',
				'1',
				'',
				'Y',
				envPath,
			]);

			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_skip2',
						client_secret: 'csc_skip2',
					}),
				} as Response);

			await main();

			const allLogCalls = logSpy.mock.calls.map((c: any[]) => c.join(' '));
			const hasWrittenTo = allLogCalls.some((l: string) => l.includes('Written to'));
			expect(hasWrittenTo).toBe(false);

			fs.rmSync(tmpDir2, { recursive: true, force: true });
		});

		test('should use default .env path when no custom path provided', async () => {
			const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'main-def-'));
			const origCwd = process.cwd();

			mockReadline([
				'cpat_valid',
				'1',
				'',
				'Y',
				'',
			]);

			jest.spyOn(global, 'fetch')
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({ ok: true } as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						app_id: 'app_1',
						client_id: 'cid_def',
						client_secret: 'csc_def',
					}),
				} as Response);

			try {
				process.chdir(tmpDir);
				await main();
				const content = fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8');
				expect(content).toContain('CHUTES_OAUTH_CLIENT_ID=cid_def');
			} finally {
				process.chdir(origCwd);
				fs.rmSync(tmpDir, { recursive: true, force: true });
			}
		});
	});

	describe('cli-entry module', () => {
		test('cli-entry.ts should exist', () => {
			const cliPath = path.resolve(__dirname, '../../scripts/cli-entry.ts');
			expect(fs.existsSync(cliPath)).toBe(true);
		});

		test('cli-entry.ts should have shebang', () => {
			const content = fs.readFileSync(
				path.resolve(__dirname, '../../scripts/cli-entry.ts'),
				'utf-8',
			);
			expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
		});

		test('cli-entry should import and call main()', () => {
			const content = fs.readFileSync(
				path.resolve(__dirname, '../../scripts/cli-entry.ts'),
				'utf-8',
			);
			expect(content).toContain("from './setup-oauth'");
			expect(content).toContain('main()');
		});

		test('cli-entry should invoke main() when loaded', () => {
			jest.isolateModules(() => {
				const mockMain = jest.fn().mockResolvedValue(undefined);
				jest.doMock('../../scripts/setup-oauth', () => ({
					main: mockMain,
				}));

				require('../../scripts/cli-entry');

				expect(mockMain).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('script shebang', () => {
		test('setup-oauth.ts should not have a shebang (moved to cli-entry.ts)', () => {
			const scriptContent = fs.readFileSync(
				path.resolve(__dirname, '../../scripts/setup-oauth.ts'),
				'utf-8',
			);
			expect(scriptContent.startsWith('#!/usr/bin/env node')).toBe(false);
		});
	});
});
