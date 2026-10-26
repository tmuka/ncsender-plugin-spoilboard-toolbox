#!/bin/bash
# Build the install zip from the committed files: dist/<id>_v<version>.zip,
# with everything under a <id>/ folder as ncSender's Plugin Manager expects.
set -e
cd "$(dirname "$0")/.."
ID=$(node -p "require('./manifest.json').id")
VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/${ID}_v${VERSION}.zip"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p dist
git archive --prefix="$ID/" HEAD | tar -x -C "$TMP"
rm -rf "$TMP/$ID/.scripts" "$TMP/$ID/tests" "$TMP/$ID/docs" "$TMP/$ID/.gitignore"
rm -f "$OUT"
(cd "$TMP" && zip -qr - "$ID") > "$OUT"
echo "$OUT"
