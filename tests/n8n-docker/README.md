# n8n Docker Testing Environment

This directory contains everything you need to test the Chutes.ai n8n node in a real n8n instance running in Docker.

## Quick Start

### Windows

```bash
# Run the batch script
start-n8n.bat
```

### macOS / Linux

```bash
# Make the script executable (first time only)
chmod +x start-n8n.sh

# Run the script
./start-n8n.sh
```

## What the Scripts Do

1. ✅ **Build** your Chutes.ai node
2. ✅ **Stop** any existing n8n container
3. ✅ **Start** a fresh n8n container with Docker Compose
4. ✅ **Install** your custom node into n8n
5. ✅ **Wait** for n8n to be ready
6. ✅ **Open** n8n in your browser automatically

## Access n8n

Once started:

- **URL**: http://localhost:5678
- **Username**: `admin`
- **Password**: `admin`

## Testing Your Node

1. **Find the Node**: Search for "Chutes" in the node palette
2. **Add to Workflow**: Drag the Chutes node into your workflow
3. **Configure Credentials**: 
   - Click on the node
   - Add your Chutes.ai API key in the credentials
4. **Select a Chute**: Use the dropdown to select from 236+ available chutes
5. **Test Operations**:
   - Text Generation (Chat/Complete)
   - Image Generation
   - Custom Inference

## Useful Docker Commands

### View Logs

```bash
docker logs -f n8n-chutes-test
```

### Stop n8n

```bash
docker-compose down
```

### Restart n8n

```bash
docker-compose restart
```

### Rebuild and Restart

```bash
# Windows
start-n8n.bat

# macOS/Linux
./start-n8n.sh
```

### Access n8n Shell

```bash
docker exec -it n8n-chutes-test sh
```

### Reinstall Node After Code Changes

```bash
# 1. Rebuild the node
cd ../..
npm run build

# 2. Reinstall in Docker
docker exec n8n-chutes-test sh -c "cd /data/custom/n8n-nodes-chutes && npm install && npm link"

# 3. Restart n8n
docker-compose restart
```

## Troubleshooting

### Node Not Appearing

1. Check if node is properly linked:
   ```bash
   docker exec n8n-chutes-test npm list -g | grep n8n-nodes-chutes
   ```

2. Check n8n logs:
   ```bash
   docker logs n8n-chutes-test
   ```

3. Restart the container:
   ```bash
   docker-compose restart
   ```

### Docker Not Starting

- **Windows**: Make sure Docker Desktop is running
- **macOS**: Make sure Docker Desktop is running
- **Linux**: Make sure Docker service is running: `sudo systemctl start docker`

### Port 5678 Already in Use

If port 5678 is already in use, edit `docker-compose.yml`:

```yaml
ports:
  - "5679:5678"  # Change 5679 to any available port
```

Then access n8n at: http://localhost:5679

### Build Errors

Make sure you're in the project root and dependencies are installed:

```bash
cd ../..
npm install
npm run build
```

## Testing Checklist

After starting n8n, test these features:

- [ ] Node appears in palette when searching "Chutes"
- [ ] Credentials configuration works
- [ ] Chute dropdown loads 236+ chutes from API
- [ ] Text Generation - Complete operation works
- [ ] Text Generation - Chat operation works
- [ ] Image Generation works
- [ ] Custom chute selection works
- [ ] Model dropdown loads for LLM chutes
- [ ] API routing uses correct subdomain
- [ ] Error handling displays properly
- [ ] Multiple chutes can be tested in same workflow

## Creating Test Workflows

Create workflow files in the `workflows/` directory:

```json
{
  "name": "Test Chutes Text Generation",
  "nodes": [
    {
      "type": "n8n-nodes-chutes.chutes",
      "parameters": {
        "resource": "textGeneration",
        "operation": "chat",
        "chuteUrl": "https://llm.chutes.ai",
        "model": "deepseek-ai/DeepSeek-R1",
        "messages": {
          "messageValues": [
            {
              "role": "user",
              "content": "Hello! Tell me about yourself."
            }
          ]
        }
      }
    }
  ]
}
```

## Next Steps

After successful testing:

1. ✅ Document any issues found
2. ✅ Create example workflows
3. ✅ Test all operations (text, image, inference)
4. ✅ Verify dynamic chute loading
5. ✅ Test error scenarios
6. ✅ Prepare for community submission

## Clean Up

To completely remove the test environment:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (deletes all n8n data)
docker-compose down -v

# Remove Docker image
docker rmi n8nio/n8n:latest
```

