# Testing Guide for n8n-nodes-chutes

This document explains how to run and write tests for the n8n-nodes-chutes package.

## Test Structure

```
tests/
├── config/              # Test configuration
├── credentials/         # Credential tests
├── setup/               # Global setup/teardown, warmup helpers
├── integration/         # Integration tests (require API key)
├── nodes/               # Unit tests for nodes (35+ files)
│   ├── Chutes/         # Main Chutes node tests
│   │   ├── operations/ # Operation-specific tests
│   │   └── videoGeneration/ # Video-specific tests
│   ├── ChutesAIAgent/  # AI Agent node tests
│   └── ChutesChatModel/ # Chat Model node tests
├── api-discovery/       # API exploration tests (20+ files)
│   └── archive/        # Archived diagnostic tests
└── AUDIT-FINDINGS.md    # Test audit results
└── COVERAGE-MATRIX.md   # Feature-to-test mapping
└── SKIPPED_TESTS.md     # Documentation of skipped tests
```

**Total:** 81 test files covering 9 resource types + infrastructure

## Running Tests

### Run All Unit Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- --testPathPattern="ChutesChatModel"
```

### Run Integration Tests

Integration tests require a `CHUTES_API_KEY` environment variable:

```bash
# Set your API key
export CHUTES_API_KEY=your_api_key_here

# Run integration tests
npm test -- --testPathPattern="tests/integration"
```

## Test Categories

### Unit Tests (`tests/nodes/`) - 35+ files

Unit tests mock all external dependencies and test the node logic in isolation:

- **Structure tests** (`*.node.test.ts`) - Verify node properties and configuration
- **Execution tests** (`*.execution.test.ts`) - Test node execution with mocked APIs
- **Parameter tests** (`*.parameters.test.ts`) - Verify node parameter definitions
- **Chute filtering tests** (`*-chutes-*.test.ts`) - Validate chute discovery and filtering
- **Top 20 model tests** (`*-top20-models.test.ts`) - Verify model family recognition

### Integration Tests (`tests/integration/`) - 20+ files

Integration tests make real API calls to Chutes.ai:

- **Text Generation:** `chutes-text-gen.test.ts`
- **Image Generation:** `chutes-image-gen.test.ts`, `image-edit.test.ts`, `qwen-image-edit-*.test.ts`
- **Music Generation:** `music-generation*.test.ts`
- **Embeddings:** `embeddings*.test.ts`
- **Content Moderation:** `content-moderation*.test.ts`, `nsfw-classifier-direct.test.ts`, `hate-speech-detector-direct.test.ts`
- **Test Helpers:** `test-helpers.ts` - Includes dynamic chute failover system

### API Discovery Tests (`tests/api-discovery/`) - 20+ files

These tests are for development and API exploration:

- **Active Discovery (14 files):** TTS, STT, video, chat completions, etc.
- **Archived Tests (8 files):** `archive/` folder contains diagnostic tests
- Used to discover API endpoints and parameters
- May fail when Chutes.ai APIs are unavailable
- Not required for CI/CD pipeline

### Setup & Infrastructure (`tests/setup/`) - 4 files

Global test infrastructure:

- **Global Warmup:** `global-warmup.ts` - Discovers and warms chutes before tests
- **Global Teardown:** `global-teardown.ts` - Cleanup after tests
- **Chute Filters:** `chute-filters.ts` - Shared filtering logic
- **Warmup Helpers:** `warmup-helpers.ts` - Warmup utilities with tests

## Writing Tests

### TDD Workflow (Required)

All feature changes must follow Test-Driven Development:

1. **Write failing test first** - Define expected behavior
2. **Implement feature** - Write minimal code to pass
3. **Verify test passes** - Run the test

### Example Unit Test

```typescript
import { ChutesNode } from '../../../nodes/Chutes/Chutes.node';

describe('ChutesNode', () => {
  let node: ChutesNode;

  beforeEach(() => {
    node = new ChutesNode();
  });

  it('should have correct display name', () => {
    expect(node.description.displayName).toBe('Chutes');
  });

  it('should execute with mocked API', async () => {
    const mockContext = createMockExecuteContext({
      // Mock parameters
    });
    
    const result = await node.execute.call(mockContext);
    
    expect(result[0][0].json.output).toBeDefined();
  });
});
```

### Example Integration Test

```typescript
import { testOrSkip, hasApiKey, getAuthHeaders, LLM_BASE_URL } from './test-helpers';

describe('Text Generation Integration', () => {
  testOrSkip('should generate text', async () => {
    const response = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
    
    expect(response.ok).toBe(true);
  });
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CHUTES_API_KEY` | Integration tests | Chutes.ai API key |

## CI/CD

Tests run automatically on:

- Push to any branch (unit tests only)
- Pull requests to main/develop (unit tests only)
- Push to main (unit + integration tests)

See `.github/workflows/test.yml` for configuration.

## Test Coverage Summary

**Overall Status:** ✅ Excellent coverage (see `COVERAGE-MATRIX.md` for details)

### By Resource Type:

| Resource | Unit Tests | Integration Tests | Status |
|----------|-----------|-------------------|--------|
| Text Generation (LLM) | ✅ 7 files | ✅ Included | Excellent |
| Image Generation | ✅ 9 files | ✅ 6 files | Excellent |
| Video Generation | ✅ 6 files | ✅ 5 files (3 skipped) | Good |
| Text-to-Speech | ✅ 1 file | ⚠️ 5 API discovery | Needs consolidation |
| Speech-to-Text | ✅ 1 file | ✅ 2 files | Good |
| Music Generation | ✅ 2 files | ✅ 2 files | Good |
| Embeddings | ✅ 1 file | ✅ 2 files | Good |
| Content Moderation | ✅ 1 file | ⚠️ 5 files | Needs review |
| Custom Inference | ✅ 1 file | ⚠️ Optional | Adequate |

### Special Features:

- **Dynamic Chute Failover:** ✅ Integrated into image generation tests
- **OpenAPI Discovery:** ✅ Unit + integration tests
- **Chute Discovery & Filtering:** ✅ Comprehensive tests per category
- **ChutesAIAgent Node:** ✅ 2 test files
- **ChutesChatModel Node:** ✅ 3 test files

### Coverage Goals:

- ✅ Unit tests: >= 80% coverage for core functionality
- ✅ All 9 resources: Structure + execution tests
- ✅ All operations: Parameter tests + integration tests
- ✅ Dynamic failover: Tested through integration
- ✅ Chute filtering: Validated with real-world data

**Test Statistics:**
- Total test files: 81
- Tests passing: 712
- Tests failing: 3 (API capacity issues, not code defects)
- Tests skipped: 11 (documented in `SKIPPED_TESTS.md`)

## Dynamic Chute Failover System

Integration tests include automatic failover when encountering API capacity issues (HTTP 429):

1. **Detects 429 errors** during test execution
2. **Discovers alternative chutes** in the same category
3. **Warms up** the alternative chute
4. **Retries** the operation with the new chute
5. **Updates** environment variables for subsequent tests

See `docs/DYNAMIC-CHUTE-FAILOVER.md` for implementation details.

## Documentation

- **`AUDIT-FINDINGS.md`** - Detailed audit results and recommendations
- **`COVERAGE-MATRIX.md`** - Complete feature-to-test mapping
- **`SKIPPED_TESTS.md`** - Documentation of permanently skipped tests
- **`../docs/DYNAMIC-CHUTE-FAILOVER.md`** - Failover system documentation

## Troubleshooting

### Tests hang or timeout

- Check if API is responding (502 errors = API unavailable)
- Increase timeout in jest config
- Dynamic failover may extend test time when switching chutes

### TypeScript errors in tests

- Run `npm run build` first
- Check imports match exported names
- Verify `setup/chute-filters.ts` exports are correct

### Integration tests fail with 429 errors

- **Expected behavior:** Dynamic failover should handle this automatically
- If all chutes in a category are at capacity, tests will fail after trying alternatives
- Check `WARMED_*_CHUTE` environment variables to see which chutes were tried

### Integration tests fail with other errors

- Verify `CHUTES_API_KEY` is set correctly
- Check Chutes.ai API status
- Some endpoints may be temporarily unavailable (502 errors)
- Review `SKIPPED_TESTS.md` for known unavailable endpoints
