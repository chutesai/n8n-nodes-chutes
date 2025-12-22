# Chutes AI Agent (alpha) - Complete Guide

The **Chutes AI Agent** node provides a complete conversational AI experience powered by Chutes.ai, without needing separate chat model nodes or complex configurations.
The **Chutes AI Agent** is not a completed feature and is currently in alpha development.

## Overview

The Chutes AI Agent is a standalone node that combines:
- 🤖 Chutes.ai LLM integration
- 💬 Conversation history management
- 🎯 System message configuration
- ⚙️ Full parameter control

## When to Use Chutes AI Agent vs. Chutes Chat Model

### Use Chutes AI Agent When:
- ✅ You want a simple chatbot
- ✅ You need conversation history tracking
- ✅ You want minimal node configuration
- ✅ You're building a Q&A system
- ✅ You don't need external Tools or Memory

### Use Chutes Chat Model When:
- ✅ You need to connect to n8n's AI Agent
- ✅ You want to use Tools (function calling)
- ✅ You need external Memory systems
- ✅ You want Output Parsers
- ✅ You're building complex autonomous agents

## Configuration

### Basic Parameters

#### 1. Chute Selection
Select which Chutes.ai LLM chute to use:
- **DeepSeek-V3**: Best for reasoning and complex tasks
- **Qwen**: Great for multilingual support
- **Custom Chutes**: Any LLM chute you've configured

```
Display Name: Chute
Type: Dropdown (dynamic)
Required: Yes
```

#### 2. Model Selection
Choose a specific model from the selected chute:
- Leave empty to use the chute's default model
- Or select a specific model version

```
Display Name: Model
Type: Dropdown (dynamic)
Required: No
Default: (chute default)
```

#### 3. Temperature
Control randomness in responses:
- **0.0**: Deterministic, focused
- **0.7**: Balanced (recommended)
- **2.0**: Creative, varied

```
Display Name: Temperature
Type: Number (0-2)
Default: 0.7
```

#### 4. Prompt Configuration
Choose how to provide the user message:

**Option A: Define Below**
- Enter the prompt directly in the node
- Good for static queries

**Option B: Take from Previous Node**
- Uses `chatInput` or `input` from previous node
- Good for dynamic workflows

```json
{
  "chatInput": "What is artificial intelligence?"
}
```

#### 5. System Message
Define the AI's behavior and role:

```
You are a helpful AI assistant specialized in explaining complex topics in simple terms.
```

**Examples:**
- Customer Support: "You are a friendly customer support agent for [Company]. Be helpful and concise."
- Code Helper: "You are an expert programmer. Provide clean, well-commented code examples."
- Translator: "You are a professional translator. Translate text accurately while preserving tone."

### Advanced Options

#### Max Tokens
Maximum length of the response:
- Default: 2000
- Range: 1 - model's maximum
- Longer = more detailed but slower

#### Conversation History
Pass previous conversation as JSON array:

```json
[
  {"role": "user", "content": "What is AI?"},
  {"role": "assistant", "content": "AI stands for Artificial Intelligence..."},
  {"role": "user", "content": "How does it work?"}
]
```

The agent automatically includes this history in the next request.

## Usage Examples

### Example 1: Simple Chatbot

**Goal**: Create a basic AI chatbot that answers user questions

**Workflow**:
1. **Webhook**: Receive user input
2. **Chutes AI Agent**: Process and respond

**Configuration**:
```
Chute: https://llm.chutes.ai
Model: (default)
Temperature: 0.7
Prompt Type: Take from Previous Node
System Message: You are a helpful assistant.
```

**Input from Webhook**:
```json
{
  "chatInput": "What is machine learning?"
}
```

**Output**:
```json
{
  "output": "Machine learning is a subset of artificial intelligence...",
  "chatInput": "What is machine learning?",
  "conversationHistory": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is machine learning?"},
    {"role": "assistant", "content": "Machine learning is..."}
  ]
}
```

### Example 2: Multi-Turn Conversation

**Goal**: Maintain context across multiple interactions

**Workflow**:
1. **Webhook**: Receive message
2. **Code**: Load previous conversation from database
3. **Chutes AI Agent**: Continue conversation
4. **Code**: Save updated conversation

**Configuration**:
```
Options > Conversation History: {{ $json.previousConversation }}
```

**Input with History**:
```json
{
  "chatInput": "Can you elaborate on that?",
  "previousConversation": [
    {"role": "user", "content": "What is AI?"},
    {"role": "assistant", "content": "AI is artificial intelligence..."}
  ]
}
```

**Output** (includes updated history):
```json
{
  "output": "Certainly! AI encompasses various technologies...",
  "conversationHistory": [...]
}
```

### Example 3: Specialized Assistant

**Goal**: Create a domain-specific expert

**Configuration**:
```
System Message: |
  You are a senior software architect specializing in microservices.
  
  Your guidelines:
  - Provide practical, production-ready advice
  - Consider scalability and maintainability
  - Reference industry best practices
  - Ask clarifying questions when needed
  
Temperature: 0.5 (more focused)
Max Tokens: 3000 (detailed responses)
```

### Example 4: Customer Support Bot

**Goal**: Automated first-line support

**Workflow**:
1. **Webhook**: Customer message
2. **Chutes AI Agent**: Analyze and respond
3. **IF**: Check if escalation needed
4. **Send Email**: Escalate to human if needed

**System Message**:
```
You are a customer support agent for TechCo.

Available actions:
- Answer common questions about products
- Check order status
- Explain return policies

If you cannot help, say "I'll connect you with a specialist" and explain why.
```

## Best Practices

### 1. System Messages

**Do:**
- ✅ Be specific about the assistant's role
- ✅ Include guidelines and constraints
- ✅ Mention available information sources
- ✅ Define tone and style

**Don't:**
- ❌ Make it too vague ("You are helpful")
- ❌ Include contradictory instructions
- ❌ Forget to set boundaries

### 2. Temperature Settings

| Use Case | Recommended Temperature |
|----------|------------------------|
| Factual Q&A | 0.3 - 0.5 |
| General chat | 0.7 - 0.9 |
| Creative writing | 1.0 - 1.5 |
| Code generation | 0.2 - 0.4 |
| Brainstorming | 1.2 - 2.0 |

### 3. Conversation History

**Managing History**:
- Store history in a database or key-value store
- Trim old messages to stay under token limits
- Keep the last 10-20 exchanges for context
- Include system message in history

**Example Trimming Logic**:
```javascript
// In a Code node before Chutes AI Agent
const maxMessages = 20;
const history = $input.item.json.conversationHistory || [];

// Keep system message + last N messages
const systemMsg = history.find(m => m.role === 'system');
const recentMessages = history.filter(m => m.role !== 'system').slice(-maxMessages);

return {
  json: {
    conversationHistory: systemMsg ? [systemMsg, ...recentMessages] : recentMessages
  }
};
```

### 4. Error Handling

Always handle potential errors:

```javascript
// In a Code node after Chutes AI Agent
const response = $input.all()[0].json;

if (response.error) {
  return {
    json: {
      success: false,
      message: "Sorry, I encountered an error. Please try again.",
      error: response.error
    }
  };
}

return {
  json: {
    success: true,
    message: response.output
  }
};
```

## Limitations

### Current Limitations
- ❌ No built-in tool calling (use Chutes Chat Model + AI Agent for that)
- ❌ No native memory systems (manage history manually)
- ❌ No output parsers (format in system message instead)
- ❌ Streaming not yet supported

### Workarounds
- **Tool Calling**: Use Chutes node with custom function logic
- **Memory**: Store history in database/Redis
- **Parsing**: Request specific formats in system message
- **Streaming**: Use webhooks for real-time updates

## Troubleshooting

### Issue: Empty Responses

**Cause**: Max tokens too low
**Solution**: Increase `Options > Max Tokens`

### Issue: Inconsistent Personality

**Cause**: Vague system message
**Solution**: Make system message more specific

### Issue: Context Lost

**Cause**: Not passing conversation history
**Solution**: Use `Options > Conversation History` parameter

### Issue: Rate Limiting

**Cause**: Too many rapid requests
**Solution**: Add delay nodes or implement queue system

## Comparison with Other Nodes

| Feature | Chutes AI Agent | Chutes Chat Model | Chutes (Original) |
|---------|----------------|-------------------|-------------------|
| Conversational AI | ✅ Built-in | ✅ Via AI Agent | ❌ Manual |
| System Messages | ✅ Yes | ✅ Yes | ⚠️ Via messages |
| History Management | ✅ Built-in | ⚠️ Via Memory | ❌ Manual |
| Tool Calling | ❌ No | ✅ Via AI Agent | ⚠️ Manual |
| Output Parsing | ❌ No | ✅ Via AI Agent | ❌ Manual |
| Ease of Setup | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Flexibility | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Example Workflow JSON

Here's a complete example workflow you can import:

```json
{
  "name": "Chutes AI Chatbot",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "chat",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "chuteUrl": "https://llm.chutes.ai",
        "model": "",
        "temperature": 0.7,
        "promptType": "auto",
        "systemMessage": "You are a helpful AI assistant.",
        "options": {
          "maxTokens": 2000
        }
      },
      "name": "Chutes AI Agent",
      "type": "n8n-nodes-chutes.chutesAIAgent",
      "position": [450, 300],
      "credentials": {
        "chutesApi": {
          "id": "1",
          "name": "Chutes API"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { \"response\": $json.output } }}"
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [650, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Chutes AI Agent", "type": "main", "index": 0 }]]
    },
    "Chutes AI Agent": {
      "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
    }
  }
}
```

## API Reference

### Input Schema

```typescript
{
  chatInput?: string;      // User message (when using "auto" mode)
  input?: string;          // Alternative input field
  conversationHistory?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}
```

### Output Schema

```typescript
{
  output: string;          // AI's response
  chatInput: string;       // Original user message
  conversationHistory: Array<{
    role: string;
    content: string;
  }>;                      // Updated conversation including this exchange
}
```

## Resources

- [Chutes.ai Playground](https://chutes.ai/app/playground) - Test models before using them
- [Chutes.ai Documentation](https://docs.chutes.ai) - Full API reference
- [n8n Community](https://community.n8n.io) - Get help and share workflows
- [GitHub Issues](https://github.com/chutesai/n8n-nodes-chutes/issues) - Report bugs or request features

## Next Steps

- Try the [example workflows](../examples/)
- Read the [AI Agent Integration Guide](./AI-AGENT-INTEGRATION.md) for advanced use cases
- Explore the [Chutes playground](https://chutes.ai/app/playground) to find the best model for your needs

