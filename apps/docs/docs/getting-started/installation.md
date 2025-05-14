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
In addition you should make sure you're on at least `iOS 13` and `Android API level 21` or above. <br />
To use React Native Skia with video support, `Android API level 26` or above is required.

For `react-native@<=0.78` and `react@<=18`, you need to use `@shopify/react-native-skia` version `1.12.4` or below.

`tvOS >= 13` is also supported.


**Install the library using yarn:**

```sh
yarn add @shopify/react-native-skia
```

**Or using npm:**

```sh
npm install @shopify/react-native-skia
```

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

Next, we recommend using [ESM](https://jestjs.io/docs/ecmascript-modules). To enable ESM support, you need to update your `jest` command to `node --experimental-vm-modules node_modules/.bin/jest`.
But we also support [CommonJS](#commonjs-setup).

### ESM Setup

To load CanvasKit and subsequently the React Native Skia mock, add the following setup file to your Jest configuration:

```js
// notice the extension: .mjs
"setupFiles": ["@shopify/react-native-skia/jestSetup.mjs"]
```

### CommonJS Setup

We also offer a version of the setup file without ECMAScript modules support. To use this version, add the following setup file to your Jest configuration:

```js
// notice the extension: .js
"setupFiles": ["@shopify/react-native-skia/jestSetup.js"]
```

With this setup, you need to load the Skia environment in your test. Include the following at the top of your test file:

```js
/**
 * @jest-environment @shopify/react-native-skia/jestEnv.mjs
 */
```

For instance:

```js
/**
 * @jest-environment @shopify/react-native-skia/jestEnv.mjs
 */
import "react-native";
import React from "react";
import { cleanup, render } from "@testing-library/react-native";
import App from "./App";

it("renders correctly", () => {
  render(<App />);
});

afterEach(cleanup);
```

With this configuration, you will have properly set up Jest to work with React Native Skia mocks using either ECMAScript Modules or CommonJS.

## Playground

We have example projects you can play with [here](https://github.com/Shopify/react-native-skia/tree/main/apps).
It would require you first to [build Skia locally](https://github.com/shopify/react-native-skia?tab=readme-ov-file#library-development) first.
