#!/bin/bash
# ========================================
#  Start n8n Docker Container for Testing
#  Chutes.ai n8n Node
# ========================================

set -e  # Exit on error

echo ""
echo "========================================"
echo "   Starting n8n with Chutes.ai Node"
echo "========================================"
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Change to project root to run build
cd ../..

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "[1/4] Building the Chutes.ai node..."
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Build failed!"
    exit 1
fi

echo ""
echo "[2/4] Stopping any existing n8n container..."
cd tests/n8n-docker
docker-compose down

echo ""
echo "[3/4] Starting n8n container..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start Docker container!"
    exit 1
fi

echo ""
echo "[4/4] Installing Chutes.ai node in n8n..."
sleep 5

# Install the custom node inside the container
docker exec n8n-chutes-test sh -c "cd /data/custom/n8n-nodes-chutes && npm install && npm link"

echo ""
echo "========================================"
echo "   n8n is starting up..."
echo "========================================"
echo ""
echo "Waiting for n8n to be ready (this may take 30-60 seconds)..."
sleep 10

# Wait for n8n to be healthy
while [ "$(docker inspect n8n-chutes-test --format='{{.State.Health.Status}}' 2>/dev/null)" != "healthy" ]; do
    echo "Still waiting for n8n to start..."
    sleep 5
done

echo ""
echo "========================================"
echo "   SUCCESS! n8n is ready!"
echo "========================================"
echo ""
echo "   URL:      http://localhost:5678"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo "To view logs:     docker logs -f n8n-chutes-test"
echo "To stop n8n:      docker-compose down"
echo "To restart n8n:   docker-compose restart"
echo ""
echo "========================================"
echo ""

# Open browser (macOS/Linux)
if command -v open > /dev/null; then
    open http://localhost:5678
elif command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5678
fi

