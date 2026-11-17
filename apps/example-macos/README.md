# macOS example

This runner shares `../example/src/App.tsx` and the example sources. Its
dependencies stay inside this workspace because React Native macOS 0.83 needs an
older React Native, Reanimated and Worklets combination than the mobile example.
Metro resolves shared imports to this app's dependencies, and Babel uses its
matching Worklets plugin.

Screens stays on 4.19 because newer exports include native tab components with
no macOS implementation. The gallery uses its JavaScript fallback instead.

## Build

From the repository root:

```sh
yarn install
yarn workspace react-native-skia copy-skia-headers
yarn workspace example-macos pod:install:macos
yarn workspace example-macos build:macos
```

Skia and Dawn binaries come from the installed npm packages; no source build is
needed. The app targets macOS 14, while Skia keeps its macOS 11 minimum.

## Run

```sh
yarn workspace example-macos start
yarn workspace example-macos macos
```

The gallery uses a JavaScript stack on macOS; mobile keeps native-stack
navigation. The shared test canvas remains available from the gallery. React
Native WebGPU remains excluded from macOS native linking; Skia vendors Dawn
itself. Demos requiring React Native WebGPU are hidden on macOS.

The exclusion also covers Apple's `ios` Codegen target used by RN macOS, so
Fabric does not register an unlinked WebGPU view. Bundled fonts use the existing
iOS Roboto fallback on macOS because CoreText cannot load `NotoColorEmoji.ttf`.
