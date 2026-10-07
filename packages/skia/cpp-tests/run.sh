#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SKIA="$ROOT/externals/skia"
CPP="$ROOT/packages/skia/cpp"
LIBSKIA="${LIBSKIA:-$SKIA/out/dawn-test/libskia.a}"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
for SANITIZER in address,undefined thread; do
  /usr/bin/clang++ -std=c++20 -O1 -g -fsanitize="$SANITIZER" \
    -I"$CPP/rnskia" -I"$CPP" -I"$SKIA" \
    -I"$ROOT/node_modules/react-native/ReactCommon/jsi" \
    "$CPP/rnskia/RNSkPipelineStorage.cpp" \
    "$ROOT/packages/skia/cpp-tests/RNSkPipelineStorageTest.cpp" "$LIBSKIA" \
    -framework CoreFoundation -framework CoreGraphics -framework CoreText \
    -framework CoreServices -framework Foundation \
    -o "$OUT/RNSkPipelineStorageTest"
  echo "Sanitizer: $SANITIZER"
  "$OUT/RNSkPipelineStorageTest"
done
