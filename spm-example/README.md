# SpmExample

A minimal React Native app that consumes `react-native-skia` through **Swift
Package Manager** instead of CocoaPods. It exists to prove
`packages/skia/Package.swift` actually builds and renders, and it is what the
`build-test-ios-spm` CI job runs.

iOS only, and Graphite only, like the library itself since v3: the package
links the prebuilt Skia Graphite archives and the Dawn WebGPU implementation
they render through. CocoaPods remains the supported default for this library;
see the Swift Package Manager section of
[`packages/skia/CONTRIBUTING.md`](../packages/skia/CONTRIBUTING.md) for the
design notes.

## Why it sits outside the yarn workspace

Swift Package Manager support requires **React Native 0.87 or newer**; earlier
releases ship no `scripts/spm`. `apps/example` is pinned to an older version, so
this app keeps its own `node_modules` and installs with npm. It ships no
lockfile: `react` and `react-native` are pinned exactly in `package.json`.

`react-native-skia` is linked from the workspace with `file:../packages/skia`,
so it builds the working tree, not a published release. npm links the package
without installing its dependencies, and `Package.swift` does not look for them
here anyway: it resolves `react-native-skia-graphite-apple-ios` (the Skia
binaries) and `react-native-webgpu-dawn` (Dawn) next to the real
`packages/skia`, that is in the monorepo root's `node_modules`. The workspace
must therefore be installed first.

## Build and run

From the repository root, once:

```sh
yarn install
yarn workspace react-native-skia copy-skia-headers   # Skia, Graphite and Dawn headers into packages/skia/cpp
```

Then, in this directory:

```sh
npm install
cd ios
npx react-native spm update   # refreshes the injected .xcodeproj, runs codegen, downloads the React Native artifacts

xcodebuild -project SpmExample.xcodeproj -scheme SpmExample \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

Release embeds its own JS bundle, so it needs no Metro. For Debug, run
`npm start` first.

The `.xcodeproj` is committed already injected, hence `spm update` rather than
`spm add`. Starting over from a CocoaPods template would be
`npx react-native spm add --deintegrate`.

## Gotchas

- **Stale `Package.resolved`.** Xcode caches package pins in
  `ios/SpmExample.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`.
  When switching the Skia or Dawn binaries between the npm-installed copies and
  locally built ones, delete it first or the old source is silently kept.
- **`spm update` re-adds an absolute `HERMES_CLI_PATH`.** On React Native
  0.87.1 the injector writes this machine's own path to `hermesc` into
  `project.pbxproj` and `.spm-injected.json`. The build does not need it
  (`react-native-xcode.sh` finds `hermesc` on its own), so it is deliberately
  not committed. Strip it again before committing:
  ```sh
  sed -i '' '/HERMES_CLI_PATH = /d' ios/SpmExample.xcodeproj/project.pbxproj
  sed -i '' '/^        "HERMES_CLI_PATH",$/d' ios/SpmExample.xcodeproj/.spm-injected.json
  ```
  facebook/react-native#58292 proposed dropping the write upstream but was
  closed without merging, so the strip stays necessary on every commit.
- **The Podfile is not for CocoaPods.** React Native's CLI finds the iOS
  project by searching for a Podfile, so a SwiftPM-only app still has to ship
  one. It installs nothing and raises if `pod install` is ever run.
- **Two React copies.** `metro.config.js` forces `react` and `react-native` to
  this app's own copies. Without that, Skia's components resolve the workspace
  root's React and hooks fail.
