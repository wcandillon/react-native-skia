---
id: installation
title: Installation
sidebar_label: Installation
slug: /getting-started/installation
---

React Native Skia brings the [Skia Graphics Library](https://skia.org/) to React Native.
Skia serves as the graphics engine for Google Chrome and Chrome OS, Android, Flutter, Mozilla Firefox, Firefox OS, and many other products.

**Version compatibility:**
`react-native@>=0.79` and `react@>=19` are required. <br />
In addition you should make sure you're on at least `iOS 14` and `Android API level 21` or above. <br />
To use React Native Skia with video support, `Android API level 26` or above is required.

For `react-native@<=0.78` and `react@<=18`, you need to use `@shopify/react-native-skia` version `1.12.4` or below.

tvOS, macOS, and macOS Catalyst are also supported platforms.

```sh
yarn add @shopify/react-native-skia
# or
npm install @shopify/react-native-skia
```

The Skia prebuilt binaries are included as npm dependencies and are automatically resolved by the native build systems. No postinstall script is needed.

## Using Expo

Expo provides a `with-skia` template, which you can use to create a new project.

```bash
yarn create expo-app my-app -e with-skia
# or
npx create-expo-app my-app -e with-skia
```

<video width="61%" autoPlay loop muted playsInline>
  <source src="https://firebasestorage.googleapis.com/v0/b/start-react-native.appspot.com/o/expo-template2.mp4?alt=media&token=cdc13f16-9c5a-488a-b5d6-19d11f3e1842" type="video/mp4" />
</video>

### Bundle Size

Below is the app size increase to be expected when adding React Native Skia to your project ([learn more](bundle-size)).

| iOS  | Android | Web    |
| ---- | ------- | ------ |
| 6 MB | 4 MB    | 2.9 MB |

## iOS

Run `pod install` on the `ios/` directory.

## Android

Currently, you will need Android NDK to be installed.
If you have Android Studio installed, make sure `$ANDROID_NDK` is available.
`ANDROID_NDK=/Users/username/Library/Android/sdk/ndk/<version>` for instance.

If the NDK is not installed, you can install it via Android Studio by going to the menu _File > Project Structure_

And then the _SDK Location_ section. It will show you the NDK path, or the option to download it if you don't have it installed.

### Proguard

If you're using Proguard, make sure to add the following rule at `proguard-rules.pro`:

```
-keep class com.shopify.reactnative.skia.** { *; }
```

### TroubleShooting

For error **_CMake 'X.X.X' was not found in SDK, PATH, or by cmake.dir property._**

open _Tools > SDK Manager_, switch to the _SDK Tools_ tab.
Find `CMake` and click _Show Package Details_ and download compatiable version **'X.X.X'**, and apply to install.

## Web

To use this library in the browser, see [these instructions](/docs/getting-started/web).

## TV

Starting from version [1.9.0](https://github.com/Shopify/react-native-skia/releases/tag/v1.9.0) React Native Skia supports running on TV devices using [React Native TVOS](https://github.com/react-native-tvos/react-native-tvos).
Currently both Android TV and Apple TV are supported.

:::info

Not all features have been tested yet, so please [report](https://github.com/Shopify/react-native-skia/issues) any issues you encounter when using React Native Skia on TV devices.

:::

## Debugging

We recommend using React Native DevTools to debug your JS code — see the [React Native docs](https://reactnative.dev/docs/debugging). Alternatively, you can debug both JS and platform code in VS Code and via native IDEs. If using VS Code, we recommend [Expo Tools](https://github.com/expo/vscode-expo), [Radon IDE](https://ide.swmansion.com/), or Microsoft's [React Native Tools](https://marketplace.visualstudio.com/items?itemName=msjsdiag.vscode-react-native#debugging-react-native-applications).

## Testing with Jest

React Native Skia test mocks use a web implementation that depends on loading CanvasKit.

The very first step is to make sure that your Skia files are not being transformed by jest, for instance, we can add it the `transformIgnorePatterns` directive:
```js
"transformIgnorePatterns": [
  "node_modules/(?!(react-native|react-native.*|@react-native.*|@?react-navigation.*|@shopify/react-native-skia)/)"
]
```

You also need to add the following to your `jest.config.js` file:

```js
// jest.config.js
module.exports = {
  // Other values
  testEnvironment: "@shopify/react-native-skia/jestEnv.js",
  setupFilesAfterEnv: [
    "@shopify/react-native-skia/jestSetup.js",
  ],
};
```

The `jestEnv.js` will load CanvasKit for you and `jestEnv.js` mocks React Native Skia.
You can also have a look at the [example app](https://github.com/Shopify/react-native-skia/tree/main/apps/example) to see how Jest tests are enabled there.


## Playground

We have example projects you can play with [here](https://github.com/Shopify/react-native-skia/tree/main/apps).
It would require you first to [build Skia locally](https://github.com/shopify/react-native-skia?tab=readme-ov-file#library-development) first.
