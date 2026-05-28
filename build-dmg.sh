#!/bin/bash
set -e

echo "==> Installing dependencies..."
npm install

echo "==> Building DMG..."
npm run tauri:build

echo ""
echo "✅ DMG built:"
find src-tauri/target/release/bundle/dmg -name "*.dmg" 2>/dev/null | while read f; do
  cp "$f" ./
  echo "   $(ls -lh "$f" | awk '{print $5, $NF}')"
  echo "   Copied to: ./$(basename "$f")"
done

echo ""
echo "Done!"
