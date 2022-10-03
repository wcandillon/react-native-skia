---
id: installation
title: Installation
sidebar_label: Installation
slug: /getting-started/installation
---

React Native Skia brings the [Skia Graphics Library](https://skia.org/) to React Native.
Skia serves as the graphics engine for Google Chrome and Chrome OS, Android, Flutter, Mozilla Firefox, Firefox OS, and many other products.


```sh
yarn add @shopify/react-native-skia
```

Or using npm:

```sh
npm install @shopify/react-native-skia
```

### Bundle Size

Below is the app size increase to be expected when adding React Native Skia to your project ([learn more](bundle-size)).

| iOS  | Android | Web   |
| ---- | ------- | ----- |
| 6 MB | 4 MB     | 7,2 MB |

## iOS

Run `pod install` on the `ios/` directory.

## Android

> **Version compatibility**: `react-native@>=0.66` is required.

Currently, you will need Android NDK to be installed.
If you have Android Studio installed, make sure `$ANDROID_NDK` is available.
`ANDROID_NDK=/Users/username/Library/Android/sdk/ndk/<version>` for instance.

If the NDK is not installed, you can install it via Android Studio by going to the menu _File > Project Structure_

And then the _SDK Location_ section. It will show you the NDK path, or the option to download it if you don't have it installed.

### Proguard

If you're using Proguard, make sure to add the following rule:

```
-keep class com.shopify.reactnative.skia.** { *; }
```

### TroubleShooting

For error **_CMake 'X.X.X' was not found in SDK, PATH, or by cmake.dir property._**

open _Tools > SDK Manager_, switch to the _SDK Tools_ tab.
Find `CMake` and click _Show Package Details_ and download compatiable version **'X.X.X'**, and apply to install.

## Web

To use this library in the browser, see [these instructions](/docs/getting-started/web).

## Playground

We have an example project you can play with [here](https://github.com/Shopify/react-native-skia/tree/main/example).

```sh
yarn boostrap
cd example && yarn start
```

To run the example project on iOS, you will need to run `pod install`, and on Android, you will also need Android NDK to be installed ([see here](#android)). 

## Debugging

As the library uses JSI for synchronous native methods access, remote debugging is no longer possible. You can use [Flipper](https://fbflipper.com) for debugging your JS code, however, connecting the debugger to the JS context.
There is also an [React Native VSCode extension](https://marketplace.visualstudio.com/items?itemName=msjsdiag.vscode-react-native#debugging-react-native-applications) that can provide a great debugging experience when using React Native Skia.

## Testing with Jest

In order to load the mock provided by React Native Skia add following to your jest config:

```js
"setupFiles": [require.resolve("@shopify/react-native-skia/jestSetup.js")]
```

Example:

```js
module.exports = {
  "preset": "react-native",
  "setupFiles": [require.resolve("@shopify/react-native-skia/jestSetup.js")]
}
```


