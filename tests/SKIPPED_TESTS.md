# Skipped Tests

Tests that skip gracefully when required infrastructure is unavailable or incompatible.

## Gracefully Skipped Tests

These tests are **enabled** but will skip automatically with clear messages when their requirements aren't met:

| Test Category | Skip Condition | Skip Message | Will Run When... |
|---------------|----------------|--------------|------------------|
| Music Generation (4 tests) | No music chutes available | "No music chute available" | Music chutes are deployed |
| Text-to-Video Tests (6+ tests) | No T2V-capable chutes | "Chute only supports I2V, not T2V" | T2V chutes become available |

## How Graceful Skipping Works

- **Chute Availability**: Tests check `if (!CHUTE_URL)` and return early with a skip message
- **Capability Detection** (NEW): Tests check chute capabilities using `supportsTextToVideo()` / `supportsImageToVideo()`
- **No Test Failures**: Graceful skips prevent false failures when infrastructure isn't ready
- **Automatic Activation**: Tests run automatically when compatible infrastructure becomes available

## Capability-Aware Video Tests

**Problem**: Text-to-video (T2V) tests were failing when only image-to-video (I2V) chutes were available.

**Solution**: Implemented capability detection that checks chute names/descriptions for:
- **T2V indicators**: "T2V", "text2video", "text-to-video", "text and image"
- **I2V indicators**: "I2V", "img2vid", "image-to-video"

**Files updated**:
- `tests/integration/test-helpers.ts` - Added `supportsTextToVideo()` and `supportsImageToVideo()`
- `tests/api-discovery/test-video-text2video.test.ts` - Now checks T2V capability before running
- `tests/api-discovery/test-video-correct-params.test.ts` - Now checks T2V capability
- `tests/api-discovery/chute-endpoints.test.ts` - Video suite checks T2V capability

**Example**: `Wan-2.2-I2V-14B-Fast` is detected as I2V-only, so T2V tests skip gracefully instead of failing.

## Technical Details

- Tests use `testOrSkip` pattern with early returns
- Capability detection functions are unit tested in `tests/unit/video-chute-capability.test.ts`
- Global warmup stores `WARMED_VIDEO_CHUTE_NAME` for capability checking
- No timeouts, no false failures, no manual test management needed

