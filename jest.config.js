module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	// Global setup - discover and warm up chutes before tests
	globalSetup: '<rootDir>/tests/setup/global-warmup.ts',
	// Global teardown - clean up connections after tests
	globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
	// CRITICAL: All tests MUST be in the /tests directory
	testMatch: ['<rootDir>/tests/**/*.test.ts'],
	// Exclude archived discovery tests from test runs
	testPathIgnorePatterns: [
		'/node_modules/',
		'/dist/',
		'/tests/api-discovery/archive/',
	],
	// Exclude tests from code coverage in non-test directories
	collectCoverageFrom: [
		'credentials/**/*.ts',
		'nodes/**/*.ts',
		'!**/*.d.ts',
		'!**/node_modules/**',
		'!dist/**',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	// Module path aliases for cleaner imports in tests
	moduleNameMapper: {
		'^@/credentials/(.*)$': '<rootDir>/credentials/$1',
		'^@/nodes/(.*)$': '<rootDir>/nodes/$1',
	},
	// Verbose output for TDD feedback
	verbose: true,
	// Automatically clear mock calls between tests
	clearMocks: true,
	// Limit parallel workers to reduce HTTP connection pool exhaustion
	// Use 50% of CPU cores for good balance between speed and resource usage
	maxWorkers: '50%',
	// Coverage thresholds (adjust as needed for TDD)
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70,
		},
	},
};

