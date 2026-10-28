#!/bin/sh
# Builds and runs the host-side C++ tests against the Skia headers that
# `yarn copy-skia-headers` puts in cpp/skia (SKIA_INCLUDE overrides it).
set -e
cd "$(dirname "$0")/.."
SKIA_INCLUDE="${SKIA_INCLUDE:-cpp/skia}"
CXX="${CXX:-clang++}"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
for test in cpp-tests/*.cpp; do
  name="$(basename "$test" .cpp)"
  "$CXX" -std=c++20 -I "$SKIA_INCLUDE" -I cpp "$test" -o "$OUT/$name"
  "$OUT/$name"
done
