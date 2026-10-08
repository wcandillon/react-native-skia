---
id: installation
title: Installation
sidebar_label: Installation
slug: /getting-started/installation
---

React Native Skia brings the [Skia Graphics Library](https://skia.org/) to React Native.
Skia serves as the graphics engine for Google Chrome and Chrome OS, Android, Flutter, Mozilla Firefox, Firefox OS, and many other products.

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

The Skia prebuilt binaries are delivered as regular npm dependencies (`react-native-skia-graphite-android`, `react-native-skia-graphite-apple-*` and `react-native-webgpu-dawn` for the WebGPU implementation Skia renders with) and are resolved automatically by the native build systems (CocoaPods on iOS and macOS, Gradle on Android). No `postinstall` script is required, so there is nothing to allow or configure: `trustedDependencies` (Bun) or `enableScripts` (Yarn Berry) settings are not needed.

## Requirements

| | Minimum version |
|:--|:--|
| React Native | `0.79`, with the New Architecture |
| React | `19` |
| iOS | `15.1` |
| Android | API level 26 (`minSdkVersion = 26`) |
| Reanimated (optional) | `react-native-reanimated@>=4.0.0` with `react-native-worklets@>=0.7.0` |

React Native Skia runs on iOS, Android, macOS, and [the Web](/docs/getting-started/web).

tvOS, Android TV, and Mac Catalyst are not supported by v3. They remain supported by [v2](https://wcandillon.github.io/react-native-skia/v2/docs/getting-started/installation).
For `react-native@<=0.78` and `react@<=18`, you need to use `@shopify/react-native-skia` version `1.12.4` or below.

## iOS

Run `pod install` on the `ios/` directory.

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
