#!/bin/bash
set -e

# Gemini Image Studio - GitHub Actions 远程打包脚本
# 用法: ./build-ci.sh [版本号]
# 示例: ./build-ci.sh v1.0.1

VERSION=${1:?用法: ./build-ci.sh <版本号，例如 v1.0.1>}

# 校验版本号格式
if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ 版本号格式错误，应为 vx.y.z，例如 v1.0.1"
  exit 1
fi

# 检查是否有未提交的改动
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️  有未提交的改动，先提交再打包"
  echo ""
  git status --short
  exit 1
fi

echo "==> 检查本地 tag..."
if git tag -l "$VERSION" | grep -q "$VERSION"; then
  echo "⚠️  tag $VERSION 已存在，是否删除并重建？(y/n)"
  read -r answer
  if [ "$answer" = "y" ]; then
    git tag -d "$VERSION"
    git push origin ":refs/tags/$VERSION" 2>/dev/null || true
  else
    echo "已取消"
    exit 0
  fi
fi

echo "==> 推送代码..."
git push origin HEAD

echo "==> 创建 tag $VERSION 并推送..."
git tag "$VERSION"
git push origin "$VERSION"

echo ""
echo "✅ CI 已触发！"
echo ""
echo "查看构建进度:"
echo "  gh run watch --exit-status"
echo ""
echo "或访问: https://github.com/tongtongtju/gemini-pic/actions"
echo ""
echo "构建完成后在 Releases 下载:"
echo "  https://github.com/tongtongtju/gemini-pic/releases"
