#!/bin/bash
# Publish script for rita: bump, tag, build, test, publish
# Usage: ./publish.sh [version]
# Example: ./publish.sh 4.0.3

set -e  # exit on any error

VERSION=${1:-}
if [ -z "$VERSION" ]; then
  echo "Usage: ./publish.sh <version>"
  echo "Example: ./publish.sh 4.0.3"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "===== 1: Bump version to $VERSION ====="
# Update package.json version
npm version "$VERSION" --no-git-tag-version


echo "===== 2: Tag version in git ====="

# Create and push git tag
TAG_NAME="v$VERSION"
git add package.json
git commit -m "release: $VERSION"
git tag "$TAG_NAME"
git push origin main
git push origin "$TAG_NAME"

echo "===== 3: Build ====="
npm run build

echo "===== 4: Run tests ====="
npm test

echo "===== 5: Publish to npm ====="
# Determine tag from version (beta if contains 'beta', else 'latest')
if [[ "$VERSION" == *"beta"* ]]; then
  TAG="beta"
else
  TAG="latest"
fi
npm publish --tag "$TAG"

echo "===== Published riscript@$VERSION to npm (tag: $TAG) ====="
