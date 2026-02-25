#!/usr/bin/env bash
set -euo pipefail

APP_NAME="nextjs-frontend"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

echo "[1/4] Building frontend..."
npm run build

echo "[2/4] Restarting PM2 app: $APP_NAME"
pm2 restart "$APP_NAME"

echo "[3/4] Current build id:"
cat .next/BUILD_ID

echo "[4/4] Latest PM2 logs:"
pm2 logs "$APP_NAME" --lines 20 --nostream
