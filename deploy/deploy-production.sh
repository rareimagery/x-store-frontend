#!/bin/bash
# Deploy production environment
# Run on VPS: bash deploy/deploy-production.sh

set -e

PROD_DIR="/var/www/rareimagery"

echo "=== Deploying Production ==="

cd "$PROD_DIR"
git fetch origin
git reset --hard origin/main

echo "Installing dependencies..."
npm ci --production=false 2>&1 | tail -3

echo "Building..."
npx next build 2>&1 | tail -5

echo "Restarting PM2..."
pm2 restart rareimagery 2>&1 | tail -3

echo ""
echo "Production deployed. Verify at https://www.rareimagery.net"
