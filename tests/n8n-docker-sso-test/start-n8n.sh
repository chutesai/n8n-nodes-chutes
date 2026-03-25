#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "========================================"
echo "  Starting n8n with Chutes.ai Node"
echo "========================================"

if ! docker info >/dev/null 2>&1; then
	echo "[ERROR] Docker is not running. Start Docker Desktop and retry."
	exit 1
fi

echo "[1/5] Building the Chutes.ai node..."
cd "${PROJECT_ROOT}"
npm run build

echo "[2/5] Stopping any existing n8n container..."
cd "${SCRIPT_DIR}"
docker compose down

echo "[3/5] Building Docker image with ffmpeg.wasm..."
docker compose build

echo "[4/5] Starting n8n container..."
docker compose up -d

echo "[5/5] Installing Chutes.ai node in n8n..."
sleep 5
docker exec n8n-chutes-test-sso sh -c "cd /data/custom/n8n-nodes-chutes && npm install && npm install -g ."

echo "Waiting for n8n healthcheck..."
until docker inspect n8n-chutes-test-sso --format='{{.State.Health.Status}}' 2>/dev/null | grep -qi healthy; do
	echo "Still waiting for n8n to start..."
	sleep 5
done

echo "========================================"
echo "  SUCCESS! n8n is ready!"
echo "========================================"
echo "URL:      http://localhost:5679"
echo "Username: admin"
echo "Password: admin"
