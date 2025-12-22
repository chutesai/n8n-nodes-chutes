/**
 * Mock helpers for testing
 * All test utilities and mocks are in /tests directory
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

/**
 * Create a mock IExecuteFunctions for testing node execution
 */
export function createMockExecuteFunctions(overrides?: Partial<IExecuteFunctions>): IExecuteFunctions {
	return {
		getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn().mockResolvedValue({
			apiKey: 'test-api-key',
			environment: 'production',
		}),
		helpers: {
			requestWithAuthentication: jest.fn(),
			prepareBinaryData: jest.fn(),
			request: jest.fn(),
		} as any,
		continueOnFail: jest.fn().mockReturnValue(false),
		getNode: jest.fn().mockReturnValue({
			name: 'Chutes Test Node',
			type: 'n8n-nodes-chutes.chutes',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow', name: 'Test' }),
		getExecutionId: jest.fn().mockReturnValue('test-execution-id'),
		...overrides,
	} as any;
}

/**
 * Create a mock ILoadOptionsFunctions for testing dynamic options loading
 */
export function createMockLoadOptionsFunctions(
	overrides?: Partial<ILoadOptionsFunctions>,
): ILoadOptionsFunctions {
	return {
		getCredentials: jest.fn().mockResolvedValue({
			apiKey: 'test-api-key',
			environment: 'production',
		}),
		helpers: {
			request: jest.fn(),
		} as any,
		getNode: jest.fn().mockReturnValue({
			name: 'Chutes Test Node',
			type: 'n8n-nodes-chutes.chutes',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		...overrides,
	} as any;
}

/**
 * Mock credentials for different environments
 */
export const mockCredentials = {
	production: {
		apiKey: 'prod-api-key-123',
		environment: 'production',
	},
	sandbox: {
		apiKey: 'sandbox-api-key-456',
		environment: 'sandbox',
	},
	custom: {
		apiKey: 'custom-api-key-789',
		environment: 'production',
		customUrl: 'https://custom.chutes.ai',
	},
};

/**
 * Helper to create mock node parameters
 */
export function mockNodeParameters(params: Record<string, any>): jest.Mock {
	const mock = jest.fn();
	Object.entries(params).forEach(([, value]) => {
		mock.mockReturnValueOnce(value);
	});
	return mock;
}

