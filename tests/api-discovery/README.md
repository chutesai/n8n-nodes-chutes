# API Discovery Tests

This directory contains **exploratory tests** that verify the actual Chutes.ai API structure and behavior.

## Purpose

These tests serve to:
1. **Document** how the Chutes.ai API actually works
2. **Verify** API behavior hasn't changed (regression detection)
3. **Discover** edge cases and undocumented features
4. **Provide living documentation** for developers

## Philosophy

These tests make **real HTTP requests** to external APIs, so:
- ✅ They're **supposed to be slow** (using 180-second timeouts per test)
- ✅ They provide **valuable API documentation**
- ✅ They catch **breaking changes** in the API
- ✅ They're **worth running** as part of the full test suite
- ✅ They **gracefully skip** when infrastructure is unavailable

## Prerequisites

Before running these tests, you need to:

1. **Copy `.env.example` to `.env`** in the project root
2. **Add your actual Chutes.ai API key** to the `.env` file
3. **Install dependencies** including dotenv

## Setup

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your API key
# CHUTES_API_KEY=your_actual_key_here

# Install dotenv if not already installed
npm install --save-dev dotenv
```

## Running API Discovery Tests

```bash
# Run all tests (including discovery)
npm test

# Run only API discovery tests
npm test -- tests/api-discovery

# Run specific discovery test with verbose output
npm test -- tests/api-discovery/test-video-image2video.test.ts --verbose

# Run only video discovery tests
npm test -- tests/api-discovery/test-video
```

## What These Tests Do

1. **Verify actual API endpoints** - Test that Chutes.ai endpoints match our assumptions
2. **Document API structure** - Capture real request/response formats
3. **Validate authentication** - Ensure API key authentication works
4. **Test chute availability** - Verify which chutes are actually available via warmup infrastructure
5. **Discover parameter behavior** - Test video parameters, audio options, and generation settings
6. **Verify response formats** - Confirm what data the API returns
7. **Test video capabilities** - Distinguish between text-to-video (T2V) and image-to-video (I2V) support

## Test Organization

### Core API Discovery Tests
- `chute-endpoints.test.ts` - Verifies LLM, image, video, and streaming endpoints
- `test-alternative-models.test.ts` - Tests alternative model support
- `test-chat-completions.test.ts` - Verifies chat completion format
- `test-chute-metadata.test.ts` - Verifies chute metadata and OpenAPI endpoints
- `inspect-chute-metadata.test.ts` - Deep inspection of chute metadata structure

### Audio API Tests
- `test-stt-simple.test.ts` - Speech-to-text endpoint verification
- `test-stt-transcribe-params.test.ts` - STT transcribe parameter discovery
- `test-tts-endpoint.test.ts` - TTS endpoint and format discovery

### Video API Tests
- `test-video-correct-params.test.ts` - Video generation parameter discovery
- `test-video-image2video.test.ts` - Image-to-video (I2V) API discovery
- `test-video-text2video.test.ts` - Text-to-video (T2V) API discovery
- `test-video-wan21-endpoints.test.ts` - Wan 2.1 model endpoint testing
- `test-video-wan22-i2v.test.ts` - Wan 2.2 I2V-specific endpoint testing

## Security & Infrastructure

- The `.env` file containing your API key is **gitignored** and will never be committed
- Tests automatically skip if no API key is found
- Tests use the **global warmup infrastructure** to ensure chutes are hot before testing
- Tests gracefully skip when chutes are unavailable (404/503 responses)
- All tests respect the `WARMED_*_CHUTE` environment variables from global setup

## Expected Outcomes

After running these tests, you should have:

- Documentation of actual API endpoints
- Verification that endpoints match assumptions (or differences noted)
- Real model IDs to replace placeholder fallbacks
- Confirmed request/response formats
- Knowledge of which parameters work and which don't

## Performance Notes

**Expected test suite time:** ~2-5 minutes (with 180-second timeouts per test)

This is normal for comprehensive API testing. The tests are:
- Making real HTTP requests to external APIs
- Testing video generation (which can take 60-120 seconds)
- Testing multiple chute types (LLM, image, video, audio, embeddings, moderation)
- Discovering undocumented API behavior
- Verifying OpenAPI schema parsing

If you need faster tests, use:
```bash
# Run only unit tests (excludes discovery and integration)
npm run test:unit
```

## Graceful Skipping

All discovery tests gracefully skip when:
- No API key is configured
- No warmed chute is available for the test type
- The chute doesn't support the required capability (e.g., T2V vs I2V)
- Infrastructure returns 404, 500, or 503 errors

This ensures tests never fail due to external API availability issues.
