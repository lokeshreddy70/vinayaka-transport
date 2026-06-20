#!/bin/bash
set -e

echo "🧹 Cleaning up Docker containers and volumes..."

# Stop all running containers
docker-compose down --volumes

echo "✅ Cleanup complete!"
echo ""
echo "To remove all images as well:"
echo "  docker system prune -a"
