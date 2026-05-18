#!/bin/bash
set -e

# Gemini Image Studio - 本地打包脚本
# 用法: ./build.sh [dmg|exe|all]

ACTION=${1:-all}

echo "==> Installing dependencies..."
npm install

echo "==> Building frontend..."
npm run build

source "$HOME/.cargo/env"

if [ "$ACTION" = "dmg" ] || [ "$ACTION" = "all" ]; then
  echo "==> Building macOS DMG..."
  npm run tauri:build
  echo ""
  echo "✅ DMG built:"
  find src-tauri/target/release/bundle/dmg -name "*.dmg" 2>/dev/null | while read f; do
    echo "   $(ls -lh "$f" | awk '{print $5, $NF}')"
  done
fi

if [ "$ACTION" = "exe" ]; then
  echo "⚠️  Windows exe cannot be cross-compiled on macOS."
  echo "   Options:"
  echo "   1. Run this script on a Windows machine"
  echo "   2. Use GitHub Actions:"
  echo "      git tag v1.0.0 && git push origin v1.0.0"
fi

echo ""
echo "Done!"
