#!/bin/bash
# ========================================
#  Stop n8n Docker Container
# ========================================

echo ""
echo "========================================"
echo "   Stopping n8n Container"
echo "========================================"
echo ""

cd "$(dirname "$0")"

docker-compose down

if [ $? -eq 0 ]; then
    echo ""
    echo "n8n container stopped successfully!"
    echo ""
else
    echo ""
    echo "[ERROR] Failed to stop container"
    echo ""
fi

