#!/bin/bash
# RareImagery VPS Deployment Script
# Run on the VPS: bash deploy/deploy.sh
set -e

APP_DIR="/var/www/rareimagery"
REPO="git@github.com:rareimagery/x-store-frontend.git"
BRANCH="main"

echo "=== RareImagery Deploy ==="

# 1. Pull latest code
if [ -d "$APP_DIR/.git" ]; then
  echo "[1/6] Pulling latest from $BRANCH..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
else
  echo "[1/6] Cloning repo..."
  git clone -b "$BRANCH" "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# 2. Enable standalone output for VPS
echo "[2/7] Enabling standalone output..."
sed -i 's|// output: "standalone"|output: "standalone"|' next.config.ts

# 3. Install dependencies
echo "[3/7] Installing dependencies..."
npm ci --production=false

# 4. Build standalone
echo "[4/7] Building Next.js (standalone)..."
npm run build

# Revert standalone flag so git stays clean
git checkout -- next.config.ts

# 5. Copy standalone + static
echo "[5/7] Preparing standalone output..."
# The standalone output includes server.js + node_modules subset
# Static assets need to be copied alongside
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true

# 6. Restart PM2
echo "[6/7] Restarting PM2..."
if pm2 describe rareimagery > /dev/null 2>&1; then
  pm2 restart rareimagery
else
  pm2 start deploy/ecosystem.config.js
fi
pm2 save

# 7. Verify
echo "[7/7] Verifying..."
sleep 3
if curl -sf http://127.0.0.1:3000/api/auth/providers > /dev/null; then
  echo "Deploy successful! Next.js is running on port 3000."
else
  echo "WARNING: Next.js may not be responding. Check: pm2 logs rareimagery"
fi

echo "=== Done ==="
