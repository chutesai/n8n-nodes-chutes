# Changelog

## [0.1.0](https://github.com/chutesai/n8n-nodes-chutes/compare/v0.0.10...v0.1.0) (2026-02-18)

### Added

#### Tool Calling Support (AI Agent)
- **Full OpenAI-compatible tool calling** in Chutes AI Agent and Chat Model nodes
- **Tool argument normalization** - automatically extracts values from single-property objects for simple LangChain tools (Wikipedia, Calculator, SerpAPI, Code Tool)
- **Proper tool response format** - sends results with correct `role: 'tool'` and `tool_call_id` per OpenAI spec
- **Assistant message preservation** - maintains original LLM response with `tool_calls` in conversation history
- Works with DeepSeek, Qwen, and other models supporting function calling

#### ChutesAIAgent & ChutesChatModel Improvements
- **Direct chute selection** in Chutes AI Agent - no longer requires separate Chat Model node
- **Added credentials block** to Chutes AI Agent for standalone operation
- **Removed redundant Model dropdown** from ChutesChatModel (chute URL specifies the model)
- **Expression support** for chute URL field (`noDataExpression: false`)
- **Removed 15 debug console.log statements** from production code

#### Multi-Image Edit Support
- **Additional Images collection** for image edit operations
- **Compose multiple images** using models like Qwen-Image-Edit-2511
- **Flexible input methods**: named binary properties, URLs, or sequential auto-mapping
- Support for 1-3 images per edit operation

### Fixed

#### Multi-Image Duplicate Execution Bug
- **Fixed critical bug** where multi-image edit and keyframe operations executed once per input item instead of once total
- **50% cost savings** - no more duplicate API calls with different seeds
- **50% faster execution** - eliminated redundant processing
- Single-image workflows remain unchanged (backward compatible)

#### n8n Framework Compliance
- **Fixed displayOptions placement** in imageGeneration.ts - child parameters within collections cannot have displayOptions
- **Expanded test coverage** to check all 9 operation files for n8n framework violations
- Added comprehensive validation preventing similar bugs in future

### Technical Details

- All changes implemented using strict TDD methodology
- 766 tests passing, 0 regressions
- Full backward compatibility maintained

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
