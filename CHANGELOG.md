# Changelog

## [0.0.11-beta.1](https://github.com/chutesai/n8n-nodes-chutes/compare/v0.0.10...v0.0.11-beta.1) (2026-01-20)

## [0.0.11-beta.0](https://github.com/chutesai/n8n-nodes-chutes/compare/v0.0.10...v0.0.11-beta.0) (2026-01-20)

## [0.0.10](https://github.com/chutesai/n8n-nodes-chutes/compare/v0.0.9...v0.0.10) (2026-01-15)

## 0.0.9 (2025-12-22)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.9] - 2025-12-15

### Added
- Initial release of Chutes.ai integration for n8n
- Complete Chutes.ai playground feature parity
- Text generation operations:
  - Complete: Generate text completions from prompts
  - Chat: Multi-turn conversations with context
  - Support for all LLM parameters (temperature, top_p, etc.)
  - Streaming support for real-time responses
  - JSON mode and response formatting
- Image generation operations:
  - Generate images from text prompts
  - Multiple size options (256x256 to 1792x1024)
  - Quality settings (Standard/HD)
  - Style presets (Natural/Vivid)
  - Negative prompts and guidance scale
  - Seed support for reproducibility
  - Batch image generation
- Inference operations:
  - Predict: Run custom model inference
  - Batch: Process multiple inputs efficiently
  - Status: Check job status for async operations
  - Webhook callback support
- API features:
  - Secure authentication with API keys
  - Environment selection (Production/Sandbox)
  - Custom API endpoint support
  - Rate limiting with exponential backoff
  - Comprehensive error handling
  - Automatic retry logic
- Dynamic model loading from Chutes.ai API
- Complete TypeScript implementation
- Comprehensive documentation and examples
- Example workflows for common use cases

### Technical Details
- No external runtime dependencies (verified node compliant)
- Uses n8n-workflow built-in helpers only
- Full TypeScript type safety
- Modular architecture with separation of concerns
- Proper error handling with NodeApiError
- Resource-based operation structure

## [Unreleased]

### Planned
- Additional model filtering options
- Enhanced streaming progress feedback
- Image-to-image transformation support
- Function calling support for compatible models
- Advanced batch processing options
- Webhook trigger node for async operations
- Cost tracking and usage metrics

---

For more details, see the [GitHub repository](https://github.com/chutesai/n8n-nodes-chutes)
