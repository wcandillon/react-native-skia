#!/bin/sh
# Builds and runs the host-side C++ tests against the Skia headers that
# `yarn copy-skia-headers` puts in cpp/skia (SKIA_INCLUDE overrides it), and
# React Native's JSI headers, which the logger includes (JSI_INCLUDE). Each
# argument names a test to run alone (`run.sh WorkerTest`); with none, all run.
set -e
cd "$(dirname "$0")/.."
SKIA_INCLUDE="${SKIA_INCLUDE:-cpp/skia}"
JSI_INCLUDE="${JSI_INCLUDE:-../../node_modules/react-native/ReactCommon/jsi}"
CXX="${CXX:-clang++}"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
if [ "$#" -eq 0 ]; then
  set -- cpp-tests/*.cpp
else
  for name in "$@"; do
    shift
    set -- "$@" "cpp-tests/$name.cpp"
  done
fi
for test in "$@"; do
  name="$(basename "$test" .cpp)"
  "$CXX" -std=c++20 -I "$SKIA_INCLUDE" -I cpp -I "$JSI_INCLUDE" "$test" -o "$OUT/$name"
  "$OUT/$name"
done
