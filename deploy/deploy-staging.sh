#!/bin/bash
# Deploy staging environment
# Run on VPS: bash deploy/deploy-staging.sh

set -e

STAGING_DIR="/var/www/rareimagery-staging"

echo "=== Deploying Staging ==="

cd "$STAGING_DIR"
git fetch origin
git reset --hard origin/staging

echo "Installing dependencies..."
npm ci --production=false 2>&1 | tail -3

echo "Building..."
npx next build 2>&1 | tail -5

echo "Restarting PM2..."
pm2 restart rareimagery-staging 2>&1 | tail -3

echo ""
echo "Staging deployed. Verify at https://staging.rareimagery.net"
