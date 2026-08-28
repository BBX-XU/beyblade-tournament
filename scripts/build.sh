#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
DIST_DIR="$ROOT_DIR/dist"

# 清理 dist
rm -rf "$DIST_DIR"

# 构建 server
npm run build:server

# 构建 client
npm run build:client

# 移动 client HTML 到 dist/dist/client（与视图引擎路径匹配）
if [ -d "$DIST_DIR/client" ]; then
  mkdir -p "$DIST_DIR/dist/client"
  if [ -d "$ROOT_DIR/client/public" ]; then
    cp -R "$ROOT_DIR/client/public/." "$DIST_DIR/dist/client/"
  fi
  find "$DIST_DIR/client" -maxdepth 1 -name "*.html" -exec mv {} "$DIST_DIR/dist/client/" \;
fi

# 复制 run.sh
cp "$ROOT_DIR/scripts/run.sh" "$DIST_DIR/"

echo "Build complete"
