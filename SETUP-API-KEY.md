# API Key Setup Guide

## Quick Setup For Development and testing only, (if you are just running n8n you do not need this)

Your API key configuration files have been created! Follow these steps:

### 1. Add Your API Key

Open the `.env` file in the project root and replace the placeholder:

```env
CHUTES_API_KEY=PUT_YOUR_ACTUAL_API_KEY_HERE
```

With your actual Chutes.ai API key:

```env
CHUTES_API_KEY=sk-your-actual-key-here
```

### 2. Files Created

- **`.env`** - Contains your actual API key (GITIGNORED - safe!)
- **`.env.example`** - Template file (safe to commit, contains no secrets)
- **`tests/config/test-config.ts`** - Loads environment variables for tests
- **`tests/integration/api-verification.test.ts`** - Real API tests
- **`tests/api-discovery/README.md`** - API testing guide

### 3. Security Status

✅ **`.env` is in `.gitignore`** - Your API key will NOT be committed to git

✅ **Toggle available** - If you need to include `.env` temporarily:
   - Edit `.gitignore`
   - Add `#` before the `.env` line
   - **WARNING:** Only do this if you absolutely know what you're doing!

### 4. Test the Configuration

```bash
# Run configuration test
npm test -- tests/integration/api-verification.test.ts

# If configured correctly, you'll see:
# ✓ should load test configuration
# ✓ should have API key for real API tests
```

### 5. Where to Get Your API Key

1. Visit https://chutes.ai
2. Sign up or log in
3. Navigate to Dashboard → API Keys
4. Create a new API key
5. Copy it to your `.env` file

### 6. Environment Options

```env
# Use production API (default)
CHUTES_ENVIRONMENT=production

# Or use sandbox for testing
CHUTES_ENVIRONMENT=sandbox

# Custom endpoint (if needed)
CHUTES_CUSTOM_URL=https://custom.api.chutes.ai
```

## How It Works

The test configuration system:

1. Loads `.env` file using `dotenv`
2. Checks if `CHUTES_API_KEY` is set
3. If not set or is placeholder, skips real API tests
4. If set, enables integration tests with real API

## Troubleshooting

**Tests are being skipped?**
- Check that `.env` file exists in project root
- Verify `CHUTES_API_KEY` is not `PUT_YOUR_ACTUAL_API_KEY_HERE`
- Make sure the key starts with valid prefix

**File not found error?**
- Run `npm install` to ensure `dotenv` is installed
- Verify `.env` is in same directory as `package.json`

**API authentication failing?**
- Double-check your API key is correct
- Try using sandbox environment first
- Check Chutes.ai dashboard for key status

## Next Steps

After configuring your API key:

1. **Review API documentation** at https://docs.chutes.ai/api
2. **Run discovery tests** to verify endpoints
3. **Update implementation** based on actual API structure
4. **Enable real API tests** by removing `.skip` from test functions

Happy testing! 

