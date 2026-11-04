#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$HOME/Library/Application Support/Apps2Samsung/Certificate/Jelly2Sams - Partner"
WORK_DIR="/tmp/xuper_sign_work"
TMP_WGT="/tmp/TizenXuperTV_unsigned.wgt"
OUT_WGT="$DIR/build/TizenXuperTV_1.6.22_signed.wgt"

echo "==> Validating certificate in: $CERT_DIR"
if [ ! -f "$CERT_DIR/author.p12" ] || [ ! -f "$CERT_DIR/distributor.p12" ]; then
  echo "ERROR: Certificate files not found in $CERT_DIR"
  exit 1
fi

SRC_DIR="$DIR/app"
if [ -d "$DIR/dist" ] && [ -f "$DIR/dist/index.html" ] && [ -f "$DIR/dist/config.xml" ]; then
  SRC_DIR="$DIR/dist"
  echo "==> Packaging React build from: $SRC_DIR"
else
  echo "==> Packaging legacy app/ directory: $SRC_DIR"
fi

rm -rf "$WORK_DIR" "$TMP_WGT"
mkdir -p "$WORK_DIR" "$DIR/build"

# Remove any stale signatures before packing
rm -f "$SRC_DIR/author-signature.xml" "$SRC_DIR/signature1.xml"

cd "$SRC_DIR"
zip -q -r "$TMP_WGT" . -x "*.DS_Store" "*__MACOSX*"

echo "==> Signing package with Apps2Samsung Partner certificate..."
python3 -I "$DIR/tools/resign_wgt.py" "$TMP_WGT" "$OUT_WGT" "$CERT_DIR" "$WORK_DIR"

echo "==> Success! Generated signed package:"
ls -lh "$OUT_WGT"
