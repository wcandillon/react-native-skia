#!/bin/sh
# Builds and runs the host-side C++ tests against the Skia headers that
# `yarn copy-skia-headers` puts in cpp/skia (SKIA_INCLUDE overrides it) and
# the Dawn headers the react-native-webgpu-dawn package puts in cpp/dawn
# (DAWN_INCLUDE overrides it).
set -e
cd "$(dirname "$0")/.."
SKIA_INCLUDE="${SKIA_INCLUDE:-cpp/skia}"
DAWN_INCLUDE="${DAWN_INCLUDE:-cpp/dawn/include}"
CXX="${CXX:-clang++}"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
for test in cpp-tests/*.cpp; do
  name="$(basename "$test" .cpp)"
  # The sources a test needs beside itself: the shared files are not
  # header-only.
  sources=""
  case "$name" in
    DawnBlobCacheTest) sources="cpp/rnwgpu/DawnBlobCache.cpp" ;;
  esac
  # On a Mac the render thread is a CFRunLoop with autorelease pools.
  libs=""
  if [ "$name" = RenderThreadTest ] && [ "$(uname)" = Darwin ]; then
    libs="-framework CoreFoundation -lobjc"
  fi
  # shellcheck disable=SC2086
  "$CXX" -std=c++20 -I "$SKIA_INCLUDE" -I "$DAWN_INCLUDE" -I cpp -I android/cpp "$test" $sources $libs -o "$OUT/$name"
  "$OUT/$name"
done
