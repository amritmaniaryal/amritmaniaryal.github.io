#!/bin/bash
set -e

echo "=== Restore source index.html for editing ==="
git show cce66b4:index.html > index.html

echo "=== Build ==="
npm run build

echo "=== Copy dist to root for GitHub Pages ==="
cp dist/index.html .
cp -r dist/assets/* assets/
cp dist/profile.jpg .
cp dist/resume.pdf .

echo "=== Stage, commit, push ==="
git add -A
echo "Commit message:"
read msg
git commit -m "$msg"
git push

echo "✓ Deployed to https://amritmaniaryal.github.io/"
