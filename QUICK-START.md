# Quick Start Guide - Chutes.ai n8n Node

Get started with the Chutes.ai n8n node in 5 minutes!

## Prerequisites

- ✅ Node.js 20.12.0 or higher installed
- ✅ n8n instance (local or cloud)
- ✅ Chutes.ai API key ([Get one here](https://chutes.ai/dashboard/api-keys))

---

##  Installation

### Option 1: npm (Recommended)
```bash
npm install n8n-nodes-chutes
```

### Option 2: Docker (Quick Testing)
Run n8n with the Chutes node pre-installed using Docker:

```bash
# Navigate to the Docker directory
cd tests/n8n-docker

# Build and start n8n with the node
docker-compose up -d

# Access n8n at http://localhost:5678
# Login: admin / admin
```

The Docker setup includes:
- ✅ n8n with FFmpeg support (for audio/video processing)
- ✅ Auto-mounted Chutes node from your local build
- ✅ Debug logging enabled
- ✅ Persistent data storage

**Stop the container:**
```bash
docker-compose down
```

### Option 3: Local Development
```bash
# In this project directory
npm link

# In your n8n directory
cd ~/.n8n/custom
npm link n8n-nodes-chutes

# Start n8n
n8n start
```

---

## 🔑 Setup Credentials

1. Open n8n (http://localhost:5678)
2. Go to **Settings** → **Credentials**
3. Click **Create New Credential**
4. Search for "Chutes API"
5. Fill in:
   - **API Key**: Your Chutes.ai API key
   - **Environment**: Production (or Sandbox for testing)
6. Click **Test** to verify connection
7. Click **Save**

---

## 📝 Your First Workflow: Text Generation

### Create a Simple Text Generation Workflow

1. **Create a new workflow**
2. **Add a Manual Trigger node**
3. **Add the Chutes node:**
   - Resource: **Text Generation**
   - Operation: **Complete**
   - Model: Select from dropdown (e.g., gpt-3.5-turbo)
   - Prompt: `"Write a haiku about coding"`
   - Temperature: `0.7`
4. **Connect the nodes**
5. **Execute the workflow**

### Expected Output:
```json
{
  "choices": [
    {
      "text": "Code flows like water,\nBugs dance in morning sunlight,\nDebug brings the peace."
    }
  ],
  "source": "chutes.ai"
}
```

---

## 🎨 Your First Image: Image Generation

### Create an Image Generation Workflow

1. **Add Manual Trigger**
2. **Add Chutes node:**
   - Resource: **Image Generation**
   - Operation: **Generate**
   - Model: Select image model
   - Prompt: `"A futuristic city at sunset, cyberpunk style"`
   - Size: `1024x1024`
   - Quality: `HD`
   - Style: `Vivid`
3. **Execute**

### Expected Output:
```json
{
  "data": [
    {
      "url": "https://cdn.chutes.ai/generated-image-xyz.png"
    }
  ],
  "source": "chutes.ai"
}
```

---

## 💬 Chat Conversation Example

### Multi-Turn Conversation

**Chutes Node Configuration:**
- Resource: **Text Generation**
- Operation: **Chat**
- Model: Select chat model
- Messages:
  ```
  1. Role: System
     Content: "You are a helpful coding assistant"
  
  2. Role: User
     Content: "How do I reverse a string in Python?"
  ```

---

## 🔧 Advanced Features

### 1. Streaming Responses
Enable in **Additional Options** → **Stream**: `true`

### 2. JSON Mode
Set **Response Format**: `JSON` in Additional Options

### 3. Temperature Control
- `0.0` = Focused, deterministic
- `1.0` = Balanced
- `2.0` = Very creative, random

### 4. Batch Image Generation
Set **Number of Images**: `3` to generate multiple variations

---

## 📚 Common Use Cases

### Content Generation Pipeline
```
Manual Trigger → Chutes (Generate Outline) → Chutes (Expand Sections) → Save to DB
```

### Image + Description
```
Manual Trigger → Chutes (Generate Image) → Chutes (Describe Image) → Post to Social
```

### Customer Support Bot
```
Webhook → Chutes (Chat Response) → Send Email/Slack
```

---

## ❓ Troubleshooting

### Issue: "Credentials not found"
**Solution:** Make sure you've created and saved Chutes API credentials

### Issue: "Rate limit exceeded"
**Solution:** The node automatically retries. Wait a moment or upgrade your Chutes.ai plan

### Issue: "Model not found"
**Solution:** Refresh the model list or check if the model is available in your Chutes.ai account

### Issue: Node not appearing in n8n
**Solution:**
```bash
# Option 1: Rebuild and restart
npm run build
n8n restart

# Option 2: Use Docker for a clean environment
cd tests/n8n-docker
docker-compose up -d
```

---

## 🎯 Next Steps

1. **Explore Parameters:** Try different temperature, top_p values
2. **Combine Operations:** Chain text and image generation
3. **Build Workflows:** Create complex AI pipelines
4. **Test with Docker:** Use `tests/n8n-docker/` for isolated testing
5. **Read Full Docs:** Check README.md for all features
6. **Share:** Contribute workflows to the community!

---

## 📞 Need Help?

- **Documentation:** [README.md](README.md)
- **Examples:** [examples/](examples/)
- **Issues:** [GitHub Issues](https://github.com/chutesai/n8n-nodes-chutes/issues)
- **Chutes.ai Docs:** https://docs.chutes.ai

---

## 🌟 Pro Tips

1. **Use expressions:** Reference previous node data with `{{$json}}`
2. **Save templates:** Create reusable workflow templates
3. **Monitor costs:** Check token usage in Chutes.ai dashboard
4. **Version control:** Keep track of your prompts
5. **Test iteratively:** Start with low token counts while developing

---

**Happy Automating! **

*Made with respect for the n8n and Chutes.ai communities*

