#!/usr/bin/env bash
# Syntax-checks the Apple sources that compile without React or Skia headers
# against every Apple SDK the package can be built for. An API that exists on
# iOS but is marked unavailable on another platform (for example
# CAMetalLayer.wantsExtendedDynamicRangeContent on tvOS) is a compile error
# that @available cannot hide, and nothing else in CI builds for tvOS.
#
# Usage: check-apple-sdks.sh [dawn-include-dir]
# Defaults to the Dawn headers installed in node_modules.
set -euo pipefail

cd "$(dirname "$0")/.."

DAWN_INCLUDE="${1:-}"
if [ -z "$DAWN_INCLUDE" ]; then
  DAWN_INCLUDE="$(dirname "$(node -p 'require.resolve("react-native-webgpu-dawn/package.json")')")/include"
fi

# The other files under apple/ need React and codegen headers, which only
# exist after a pod install, or the Skia headers, which are copied from the
# Skia submodule.
FILES=(apple/MetalLayerColorSpace.mm)

# sdk:target pairs, using the podspec's minimum versions.
TARGETS=(
  iphoneos:arm64-apple-ios15.1
  iphonesimulator:arm64-apple-ios15.1-simulator
  macosx:arm64-apple-macos11.0
  appletvos:arm64-apple-tvos15.1
  appletvsimulator:arm64-apple-tvos15.1-simulator
)

status=0
for pair in "${TARGETS[@]}"; do
  sdk="${pair%%:*}"
  target="${pair#*:}"
  for file in "${FILES[@]}"; do
    if xcrun --sdk "$sdk" clang++ -target "$target" -std=c++20 -fobjc-arc \
      -fsyntax-only -w -x objective-c++ -I "$DAWN_INCLUDE" -I cpp \
      -I apple "$file"; then
      echo "✅ $sdk $file"
    else
      echo "❌ $sdk $file"
      status=1
    fi
  done
done
exit $status
