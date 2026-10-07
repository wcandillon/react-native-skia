# React Native Skia Binaries

This workspace generates and publishes prebuilt Skia binary packages for [React Native Skia](https://github.com/wcandillon/react-native-skia).

The remote SwiftPM manifest (`dist/spm/Package.swift`) and its release zips are published to [wcandillon/react-native-skia-binaries](https://github.com/wcandillon/react-native-skia-binaries), since SwiftPM resolves a package from a repository root.

Graphite packages bundle the shared Dawn (`libwebgpu_dawn`, the same artifact react-native-webgpu links) instead of the static `libdawn_combined`, pinned by the `dawn` section of `skia-config.json`. The release tag is written to `libs/.dawn-version` in each package, which react-native-skia checks against react-native-webgpu's own Dawn.

## Overview

The binaries are downloaded from GitHub releases and bundled directly into npm packages. No postinstall scripts - the binaries are included in the package and ready to use immediately upon installation.

## Packages

### Ganesh (Standard Metal/OpenGL backend)

| Package | Platform | Description |
|---------|----------|-------------|
| `react-native-skia-android` | Android | All architectures (armeabi-v7a, arm64-v8a, x86, x86_64) |
| `react-native-skia-apple-ios` | Apple | iOS (device + simulator + Mac Catalyst) |
| `react-native-skia-apple-tvos` | Apple | tvOS (device + simulator) |
| `react-native-skia-apple-macos` | Apple | macOS (arm64 + x64) |

### Graphite (Dawn/WebGPU backend)

| Package | Platform | Description |
|---------|----------|-------------|
| `react-native-skia-graphite-android` | Android | All architectures (armeabi-v7a, arm64-v8a, x86, x86_64) |
| `react-native-skia-graphite-apple-ios` | Apple | iOS (device + simulator) |
| `react-native-skia-graphite-apple-macos` | Apple | macOS (arm64 + x64) |
| `react-native-skia-graphite-headers` | Common | Graphite headers |

## Usage

```bash
# Install a specific platform package
npm install react-native-skia-apple-ios
```

The binaries are included directly - no download happens at install time.

## Configuration

The `skia-config.json` file contains the current Skia versions and checksums:

```json
{
  "skia": {
    "version": "m144c",
    "repo": "shopify/react-native-skia",
    "checksums": {
      "android-armeabi-v7a": "...",
      "apple-ios-xcframeworks": "...",
      ...
    }
  },
  "skia-graphite": {
    "version": "m154_8037_58a",
    "checksums": { ... }
  },
  "dawn": {
    "releaseTag": "dawn-chrome-m154a",
    "checksums": { "android": "...", "apple": "..." }
  }
}
```

`version` is the Build SKIA release tag without its `skia-` or `skia-graphite-` prefix. Build SKIA names the release after the Skia branch the submodule commit is on, so it is a milestone (`m144`), a milestone with a re-spin suffix (`m144c`), or a Chromium release branch with an optional suffix (`m154_8037_58a`) once `chrome/m154` has moved past the pinned commit. The npm version is derived from it: the milestone is the major and the suffix letter the minor (`m144c` → 144.3.0, `m154_8037_58a` → 154.1.0; the branch digits do not affect it). `repo` points an entry at another repository's releases; leave it out for releases of this repository. The `checksums` are the ones `yarn verify` computes over a `yarn download` of that version.

## Publishing New Versions

### Via GitHub Actions

1. Update `skia-config.json` and merge it to `main`
2. Go to **Actions** > **Publish Skia Binary Packages** and click **Run workflow**
3. Fill in:
   - **variant**: `graphite`, `ganesh` or `all` (a version already on npm cannot be republished)
   - **patch_version**: the patch of the npm version, `0` unless the same Skia version is repackaged (`m154_8037_58a` + `1` → `154.1.1`)
   - **Dry run**: uncheck to actually publish

### Local Development

```bash
# Install dependencies (from the monorepo root)
yarn

# Generate ALL packages (Ganesh + Graphite) from config file
yarn tsx src/generate-packages.ts --config=skia-config.json

# Generate all Ganesh packages (npm version derived: m144c → 144.3.0)
yarn tsx src/generate-packages.ts --skia-version=m144c

# Generate a specific package
yarn tsx src/generate-packages.ts --skia-version=m144c --package=apple-ios

# Generate Graphite packages
yarn tsx src/generate-packages.ts --skia-version=m142b --graphite

# Override npm version if needed
yarn tsx src/generate-packages.ts --skia-version=m144c --npm-version=144.3.1

# Download a release into libs/ and verify it against skia-config.json
yarn download --skia-version=m154_8037_58a --graphite
yarn verify --graphite

# Publish (from generated package directory)
cd dist/react-native-skia-apple-ios
npm publish --access public
```

## Generated Package Structure

```
dist/
├── react-native-skia-android/
│   ├── package.json
│   ├── README.md
│   └── libs/
│       ├── armeabi-v7a/*.a
│       ├── arm64-v8a/*.a
│       ├── x86/*.a
│       └── x86_64/*.a
├── react-native-skia-apple-ios/
│   ├── package.json
│   ├── README.md
│   └── libs/
│       ├── libskia.xcframework/
│       └── ...
├── react-native-skia-graphite-android/
│   └── ...
└── ...
```

## License

MIT License - see [LICENSE](LICENSE) for details.
