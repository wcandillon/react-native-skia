---
id: installation
title: Installation
sidebar_label: Installation
slug: /getting-started/installation
---

React Native Skia brings [Skia](https://skia.org/), the rendering engine behind Google Chrome, to React Native.

It renders with Graphite, Skia's new GPU backend built on WebGPU ([Dawn](https://dawn.googlesource.com/dawn)).
Graphite plugs directly into [React Native WebGPU](/docs/webgpu), so 2D drawings, 3D scenes, and machine learning models share the same GPU device and the same canvas, without any copy.
The result is a unified GPU runtime for React Native.

:::info[React Native Skia v3]

This is the documentation of React Native Skia v3, which renders with Skia Graphite and is published on npm as `react-native-skia`.

- Upgrading from v2 or from `@shopify/react-native-skia`? Follow the [migration guide](/docs/getting-started/migration).
- v2 is still maintained. Its documentation is available at [wcandillon.github.io/react-native-skia/v2](https://wcandillon.github.io/react-native-skia/v2/).

:::

```sh
yarn add react-native-skia
# or
npm install react-native-skia
```

## Prebuilt binaries

Skia and Dawn binaries are downloaded automatically from this repository's [GitHub releases](https://github.com/wcandillon/react-native-skia/releases) during native builds. The installed `react-native-skia` package includes the headers and a `binaries.json` file that pins the binary release and checksums. No binary npm dependencies, manual downloads, or `postinstall` script are needed.

- **Android:** Gradle downloads separate Skia and Dawn archives for each ABI being built, then verifies and extracts the libraries for CMake. Downloads use Gradle's dependency cache.
- **Apple:** An Xcode build phase downloads archives for the selected SDK, such as `iphoneos`, `iphonesimulator`, or `maccatalyst`, and prepares the libraries for linking. Each archive includes all architectures published for that SDK, with lipo'd universal libraries where applicable. Other SDKs are not downloaded. Downloads are cached under `~/Library/Caches/react-native-skia`, similar to React Native and Hermes' shared macOS cache.

  - **CocoaPods:** `pod install` adds the preparation phase automatically; binaries are downloaded when Xcode builds.
  - **SwiftPM (optional):** Installs the same preparation phase. Requires React Native 0.87.1 or newer.

The first build needs access to GitHub unless the required archives are cached or local binaries are provided. Later builds reuse cached downloads. Checksums are verified before use; failed downloads or checksum mismatches stop the build with an error.

### Mirrors and offline builds

Set `REACT_NATIVE_SKIA_BINARIES_URL` to download from a mirror or a local `file:///` directory on either platform. Android also accepts the `reactNativeSkiaBinariesUrl` Gradle property. The location must contain `binaries-<version>/<asset>` matching the installed `binaries.json`; checksum verification still applies.

## Requirements

| | Minimum version |
|:--|:--|
| React Native | `0.79`, with the New Architecture |
| React | `19` |
| iOS | `15.1` |
| tvOS | `15.1` |
| macOS | `14.0` |
| Android | API level 26 (`minSdkVersion = 26`) |
| Reanimated (optional) | `react-native-reanimated@>=4.0.0` with `react-native-worklets@>=0.7.0` |

React Native Skia runs on iOS, Android, macOS, Mac Catalyst, tvOS, and [the Web](/docs/getting-started/web).

Android TV is not supported by v3. It remains supported by [v2](https://wcandillon.github.io/react-native-skia/v2/docs/getting-started/installation/).
For `react-native@<=0.78` and `react@<=18`, you need to use `@shopify/react-native-skia` version `1.12.4` or below.
On React Native below `0.83` (React `19.0` or `19.1`), your package manager warns that `react-reconciler` asks for React `19.2`: this is expected, as React Native Skia ships React 19.2's reconciler, which also renders on React 19.0 and 19.1.

## iOS

Run `pod install` on the `ios/` directory.

## macOS

Run `pod install` in the `macos/` directory.

## Android

React Native Skia requires Android API level 26 or above and renders with Vulkan.
React Native projects default to a lower `minSdkVersion`, so raise it in `android/build.gradle`:

```groovy
buildscript {
    ext {
        minSdkVersion = 26
    }
}
```

### Vulkan

Skia renders with Vulkan 1.1, which every 64-bit device shipped with Android 10 or later supports.
The library's manifest declares it as a required feature, so the Play Store does not serve your app to devices without it.
This does not affect the emulator (use an API 29 or later image with hardware graphics acceleration).

On a device without Vulkan the app still runs: `Skia.gpu.isAvailable` is false, `Skia.gpu.error` says why, and canvases stay blank (see [the GPU device](/docs/webgpu#the-gpu-device)).
An app that has to render on such devices uses [v2](https://wcandillon.github.io/react-native-skia/v2/docs/getting-started/installation/), which renders with OpenGL ES.
To ship to those devices anyway, remove the declaration from your app's manifest and check the flag before rendering with Skia:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          xmlns:tools="http://schemas.android.com/tools">
  <uses-feature android:name="android.hardware.vulkan.version" tools:node="remove" />
</manifest>
```

If another dependency already declares `android.hardware.vulkan.version` with a different version, keep one declaration and mark it `tools:replace="android:version"`.

Currently, you will need Android NDK to be installed.
If you have Android Studio installed, make sure `$ANDROID_NDK` is available.
`ANDROID_NDK=/Users/username/Library/Android/sdk/ndk/<version>` for instance.

If the NDK is not installed, you can install it via Android Studio by going to the menu _File > Project Structure_

And then the _SDK Location_ section. It will show you the NDK path, or the option to download it if you don't have it installed.

### TroubleShooting

For error **_CMake 'X.X.X' was not found in SDK, PATH, or by cmake.dir property._**

open _Tools > SDK Manager_, switch to the _SDK Tools_ tab.
Find `CMake` and click _Show Package Details_ and download compatiable version **'X.X.X'**, and apply to install.

## Expo

React Native Skia v3 requires a [development build](https://docs.expo.dev/develop/development-builds/introduction/).
It does not run in Expo Go, which bundles the native code of v2.

```sh
npx expo install react-native-skia expo-build-properties
```

Use [expo-build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/) to set the Android `minSdkVersion` in your app config:

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", { "android": { "minSdkVersion": 26 } }]
    ]
  }
}
```

Then create the development build with `npx expo run:ios` and `npx expo run:android`.

## Web

To use this library in the browser, see [these instructions](/docs/getting-started/web).

## Debugging

We recommend using React Native DevTools to debug your JS code: see the [React Native docs](https://reactnative.dev/docs/debugging). Alternatively, you can debug both JS and platform code in VS Code and via native IDEs. If using VS Code, we recommend [Expo Tools](https://github.com/expo/vscode-expo), [Radon IDE](https://ide.swmansion.com/), or Microsoft's [React Native Tools](https://marketplace.visualstudio.com/items?itemName=msjsdiag.vscode-react-native#debugging-react-native-applications).

## Testing with Jest

React Native Skia test mocks use a web implementation that depends on loading CanvasKit.

The very first step is to make sure that your Skia files are not being transformed by jest, for instance, we can add it the `transformIgnorePatterns` directive:
```js
"transformIgnorePatterns": [
  "node_modules/(?!(react-native|react-native.*|@react-native.*|@?react-navigation.*|react-native-skia)/)"
]
```

You also need to add the following to your `jest.config.js` file:

```js
// jest.config.js
module.exports = {
  // Other values
  testEnvironment: "react-native-skia/jestEnv.js",
  setupFilesAfterEnv: [
    "react-native-skia/jestSetup.js",
  ],
};
```

The `jestEnv.js` will load CanvasKit for you and `jestSetup.js` mocks React Native Skia.
You can also have a look at the [example app](https://github.com/wcandillon/react-native-skia/tree/main/apps/example) to see how Jest tests are enabled there.

## Playground

We have example projects you can play with [here](https://github.com/wcandillon/react-native-skia/tree/main/apps).
To run them, follow the [contributing guide](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md).
