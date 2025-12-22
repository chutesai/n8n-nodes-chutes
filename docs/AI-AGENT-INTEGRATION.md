# AI Agent (alpha) Integration Guide

## Overview

The **Chutes Chat Model** node enables you to use Chutes.ai's powerful LLM models with n8n's AI Agent.
The **Chutes Chat Model** node is not a completed feature and is currently in alpha development. This allows you to build sophisticated AI workflows with features like:

- 🤖 Autonomous agents that can plan and execute tasks
- 💬 Multi-turn conversations with memory
- 🔧 Tool calling and function execution
- 🧠 Reasoning and decision-making capabilities

## Installation

When you install the `n8n-nodes-chutes` package, you get **both** nodes:

1. **Chutes** - Traditional workflow node for direct API calls
2. **Chutes Chat Model** - AI Agent-compatible chat model node

```bash
npm install n8n-nodes-chutes
```

## Quick Start

### Basic AI Agent Setup

1. **Add a Manual Trigger** to your workflow
2. **Add the Chutes Chat Model node**
   - Select your preferred chute (e.g., `https://llm.chutes.ai`)
   - Choose a model (e.g., DeepSeek-V3, Qwen2.5)
   - Configure temperature and other parameters
3. **Add an AI Agent node**
   - Connect the Chutes Chat Model to the AI Agent's "Model" input
   - Configure the agent's prompt and tools
4. **Execute and test!**

## Node Comparison

### When to Use Chutes Chat Model

✅ **Use Chutes Chat Model when:**
- Building AI Agents with autonomous behavior
- Need multi-turn conversations with context
- Want to use n8n's AI tools ecosystem
- Building complex agentic workflows

### When to Use Chutes Node

✅ **Use Chutes Node when:**
- Making direct API calls to Chutes.ai
- Need fine-grained control over request/response
- Working with non-LLM resources (image generation, embeddings, etc.)
- Building simple request-response workflows

## Configuration

### Chute Selection

The Chutes Chat Model node supports dynamic chute selection:

- **Default LLM Chute**: `https://llm.chutes.ai` - Best for most use cases
- **Custom Chutes**: Select any LLM-compatible chute from the dropdown
- Browse available chutes at [Chutes.ai Playground](https://chutes.ai/app/playground)

### Model Selection

Models are loaded dynamically based on your selected chute:

- If a chute supports `/v1/models`, you'll see a dropdown of available models
- If a chute has a fixed model, the selection will show "Default (selected by chute)"
- Popular models: DeepSeek-V3, DeepSeek-R1, Qwen2.5, and more

### Parameters

#### Temperature (0.0 - 2.0)
Controls creativity vs consistency:
- **Low (0.0 - 0.5)**: More focused, deterministic responses
- **Medium (0.5 - 1.0)**: Balanced creativity
- **High (1.0 - 2.0)**: More creative, varied responses

#### Max Tokens
Maximum length of the generated response. Default: 1000 tokens.

#### Advanced Options

- **Top P**: Nucleus sampling threshold (0.0 - 1.0)
- **Frequency Penalty**: Reduce repetition based on token frequency (-2.0 to 2.0)
- **Presence Penalty**: Encourage new topics (-2.0 to 2.0)

## Example Workflows

### Example 1: Simple Question Answering Agent

```
[Manual Trigger] → [AI Agent]
                     ↑
              [Chutes Chat Model]
```

**Configuration:**
- Chutes Chat Model: DeepSeek-V3, Temperature 0.7
- AI Agent Prompt: "You are a helpful assistant. Answer questions concisely and accurately."

### Example 2: Research Agent with Tools

```
[Manual Trigger] → [AI Agent] → [Process Results]
                     ↑  ↑  ↑
                     │  │  └─ [Web Search Tool]
                     │  └──── [Calculator Tool]
                     └──────── [Chutes Chat Model]
```

**Configuration:**
- Chutes Chat Model: DeepSeek-R1 (reasoning model), Temperature 0.5
- AI Agent: Connected to multiple tools for research tasks

### Example 3: Customer Support Agent

```
[Webhook] → [AI Agent] → [Send Email]
              ↑  ↑
              │  └─ [Database Tool]
              └──── [Chutes Chat Model]
```

**Configuration:**
- Chutes Chat Model: Qwen2.5, Temperature 0.3 (consistent responses)
- AI Agent: Access to customer database for personalized support

## Features

### ✅ Supported Features

- **Multi-turn conversations**: Full message history support
- **All Chutes.ai LLM models**: DeepSeek, Qwen, GPT, and more
- **Dynamic chute selection**: Choose from all available LLM chutes
- **Advanced parameters**: Temperature, max tokens, penalties, etc.
- **Error handling**: Graceful failures with detailed error messages
- **Shared credentials**: Reuse your Chutes.ai API key across nodes

### ⏳ Planned Features

- **Streaming responses**: Real-time token generation (when n8n AI Agent supports it)
- **Function calling**: Structured tool calling (when Chutes.ai supports it)
- **Token usage tracking**: Monitor and optimize costs

## Technical Details

### Message Format

The Chutes Chat Model automatically converts between n8n/LangChain message format and Chutes.ai's API format:

**Input (LangChain format):**
```typescript
[
  { role: "system", content: "You are a helpful assistant" },
  { role: "user", content: "Hello!" },
  { role: "assistant", content: "Hi there!" },
  { role: "user", content: "How are you?" }
]
```

**Output (Chutes.ai format):**
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant" },
    { "role": "user", "content": "Hello!" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "How are you?" }
  ],
  "model": "deepseek-ai/DeepSeek-V3",
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

### API Endpoint

The Chutes Chat Model uses the `/v1/chat/completions` endpoint, which:

- Follows OpenAI-compatible format
- Returns complete, non-truncated responses
- Supports all modern LLM features
- Is the recommended endpoint for all text generation tasks

### Reused Components

The Chutes Chat Model leverages existing infrastructure:

- **Credentials**: Shares `ChutesApi` credentials with the Chutes node
- **Chute Discovery**: Uses the same chute loading mechanism
- **Model Loading**: Dynamically loads models from selected chute
- **Error Handling**: Same retry logic and error messages

## Troubleshooting

### Chat Model Not Appearing in AI Agent

**Solution**: Ensure you're using n8n version 1.0.0 or higher. Restart n8n after installing the package.

### "Model Not Found" Error

**Solution**: 
1. Check that your selected chute supports the chosen model
2. Try leaving the model field empty to use the chute's default model
3. Verify your API key has access to the selected chute

### Responses Are Too Short

**Solution**: 
1. Increase the "Max Tokens" parameter (default is 1000)
2. Check the AI Agent's prompt isn't requesting brief responses
3. Adjust temperature for more verbose outputs

### Rate Limiting Errors

**Solution**: 
1. The node includes automatic retry logic with exponential backoff
2. Reduce concurrent requests
3. Check your Chutes.ai account limits

## Best Practices

### 1. Choose the Right Model

- **DeepSeek-V3**: General-purpose, balanced performance
- **DeepSeek-R1**: Best for reasoning, math, complex logic
- **Qwen2.5**: Excellent for multilingual tasks
- **GPT-4**: Advanced understanding and generation

### 2. Optimize Temperature

- **Customer support**: 0.3 - 0.5 (consistent, reliable)
- **Creative writing**: 0.8 - 1.2 (varied, creative)
- **Code generation**: 0.3 - 0.7 (accurate, focused)
- **General chat**: 0.7 - 0.9 (natural, engaging)

### 3. Use Custom Chutes

For specialized tasks, create custom chutes at [Chutes.ai](https://chutes.ai) with:
- Pre-configured system prompts
- Optimized model parameters
- Cost controls and rate limits

### 4. Monitor Token Usage

- Set appropriate max_tokens to avoid truncation
- Use frequency/presence penalties to reduce verbosity
- Consider cost implications of different models

## Support

- **Documentation**: [n8n-nodes-chutes GitHub](https://github.com/chutesai/n8n-nodes-chutes)
- **Issues**: Report bugs on GitHub Issues
- **Chutes.ai Support**: [Chutes.ai Documentation](https://chutes.ai/docs)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io)

## Advanced Examples

### Multi-Agent Workflow

Build complex workflows with multiple specialized agents:

```
[Trigger] → [Router Agent] ──→ [Research Agent] → [Synthesize]
              ↑                  ↑
              │                  └─ Chutes Chat Model (DeepSeek-R1)
              └─ Chutes Chat Model (GPT-4)
```

Each agent can use different models optimized for their role.

### Conversation Memory

The AI Agent automatically maintains conversation history, allowing for natural multi-turn dialogues:

```
User: "What's the weather like?"
Agent: "I need your location to check the weather."
User: "San Francisco"
Agent: "The weather in San Francisco is..."
```

The Chutes Chat Model receives the full message history for context-aware responses.

---

**Happy Building!** 

If you create something cool with the Chutes Chat Model, share it with the n8n community!

