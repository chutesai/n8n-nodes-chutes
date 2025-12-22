# CI/CD Quick Reference

## Test Categories

| Category | Command | Speed | Blocks PRs? | When it runs |
|----------|---------|-------|-------------|--------------|
| **Unit Tests** | `npm run test:unit` | ~30s | ✅ YES | All PRs & pushes |
| **Integration Tests** | `npm run test:integration` | ~2-7min | ✅ YES (skips gracefully) | PRs & beta pushes |
| **Slow Tests** | `npm run test:slow` | ~10-30min | ✅ YES (skips gracefully) | PRs & beta pushes |
| **Build Check** | `npm run build` | ~1min | ✅ YES | All PRs & pushes |

## What Tests Block PRs?

### ✅ ALL TESTS ARE BLOCKING
- **Unit Tests** - Code correctness, no external dependencies
- **Integration Tests** - API integration with graceful skipping when chutes unavailable
- **Slow Tests** - Long-running tests with graceful skipping when chutes unavailable
- **Build Verification** - Package builds successfully

**Key Design**: Tests use dynamic chute discovery and warmup validation. If a chute isn't hot/available, tests skip gracefully (passing) instead of failing with 404 errors.

## Common Test Failures Explained

| Error | Cause | Blocks PR? | Action |
|-------|-------|------------|--------|
| Unit test assertion fails | Code bug | ✅ YES | Fix your code |
| Integration test HTTP 404 | Warmup validation failed | ✅ NO (skips gracefully) | Check chute deployment |
| Integration test HTTP 429 | Rate limiting | ✅ NO (skips gracefully) | Tests skip when rate limited |
| Slow test timeout | Cold start/queue | ✅ NO (skips gracefully) | Warmup validation prevents this |

## Running Tests Locally

```bash
# Development workflow
npm run test:unit              # Quick check (30s)
npm run test:integration       # API integration (2-7min)
npm run test:slow             # Full validation (10-30min)

# TDD workflow
npm run test:tdd              # Watch mode with coverage

# CI simulation
npm run test:ci               # All tests with CI flags
```

## GitHub Actions Workflow

### On Pull Request
```
┌─────────────────────────────────────────┐
│ PR Opened/Updated                       │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
      ▼                       ▼
┌──────────┐           ┌──────────────┐
│ Unit     │           │ Build Check  │
│ Tests    │           │              │
│ ✅ BLOCKS │           │ ✅ BLOCKS     │
└─────┬────┘           └──────────────┘
      │
      ├──────────────────┬──────────────────┐
      │                  │                  │
      ▼                  ▼                  ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│Integration │    │ Slow Tests │    │            │
│ Tests      │    │            │    │  PR can    │
│ ⚠️ WARNS    │    │ ⚠️ WARNS    │    │  merge!    │
└────────────┘    └────────────┘    └────────────┘
```

### On Push to DEV
```
┌─────────────────────────────────────────┐
│ Push to DEV                             │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
      ▼                       ▼
┌──────────┐           ┌──────────────┐
│ Unit     │           │ Build Check  │
│ Tests    │           │              │
│ ✅ BLOCKS │           │ ✅ BLOCKS     │
└──────────┘           └──────────────┘

(Integration/Slow tests skipped to save CI minutes)
```

### On Push to beta-*
```
┌─────────────────────────────────────────┐
│ Push to beta-*                          │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
      ▼                       ▼
┌──────────┐           ┌──────────────┐
│ Unit     │           │ Build Check  │
│ Tests    │           │              │
│ ✅ BLOCKS │           │ ✅ BLOCKS     │
└─────┬────┘           └──────────────┘
      │
      ├──────────────────┬──────────────────┐
      │                  │                  │
      ▼                  ▼                  ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│Integration │    │ Slow Tests │    │ Push       │
│ Tests      │    │            │    │ succeeds   │
│ ⚠️ WARNS    │    │ ⚠️ WARNS    │    │ anyway     │
└────────────┘    └────────────┘    └────────────┘
```

## Decision Tree: Should I Fix This Failure?

```
Test failed?
│
├─ Is it a unit test?
│  └─ YES → 🔴 FIX IT - Real code problem
│
├─ Is it HTTP 404/503?
│  └─ YES → ⚠️ External API unavailable, not your problem
│
├─ Is it HTTP 429?
│  └─ YES → ⚠️ Rate limited, wait or add retry logic
│
├─ Is it a timeout?
│  ├─ Unit test? → 🔴 FIX IT - Code too slow
│  └─ Integration/Slow test? → ⚠️ Cold start or queue, not your problem
│
└─ Response format unexpected?
   └─ 🟡 INVESTIGATE - Could be code bug or API change
```

## Key Differences vs Old Workflow

| Aspect | Old | New |
|--------|-----|-----|
| Chute URLs | ❌ Hardcoded | ✅ Dynamically discovered |
| Chute availability check | ❌ None | ✅ Warmup validation |
| External API 404 | ❌ Test fails, blocks PR | ✅ Test skips gracefully, passes |
| Rate limiting 429 | ❌ Test fails, blocks PR | ✅ Test skips gracefully, passes |
| Cold chute timeout | ❌ Test fails, blocks PR | ✅ Test skips gracefully, passes |
| Unit test failure | ❌ Blocks PR | ❌ Blocks PR (unchanged) |
| Dev push integration tests | ✅ Runs | ⚠️ Skipped (saves CI minutes) |

## Philosophy

> **Tests should be reliable and never block PRs due to external API issues.**

**The Solution**: Dynamic chute discovery with warmup validation
1. **Discovery**: Find available chutes from Chutes.ai API
2. **Validation**: Confirm each chute is actually hot/working
3. **Graceful skipping**: Tests skip when no working chute is available
4. **No hardcoding**: All chute URLs discovered dynamically

Result: Tests pass (by skipping) instead of failing with 404/429 errors.

---

**TL;DR**: Unit tests block PRs. Integration/slow tests warn but don't block. You can merge confidently when your code is correct.


