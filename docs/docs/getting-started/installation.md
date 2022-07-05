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

## iOS

Run `pod install` on the `ios/` directory.

## Android

> **Version compatibility**: `react-native@>=0.66` is required.

Currently, you will need Android NDK to be installed.
If you have Android Studio installed, make sure `$ANDROID_NDK` is available.
`ANDROID_NDK=/Users/username/Library/Android/sdk/ndk-bundle` for instance.

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

## Playground

We have an example project you can play with [here](https://github.com/Shopify/react-native-skia/tree/main/example).

```sh
yarn
cd package && yarn && cd ..
cd example && yarn && yarn start
```

To run the example project on iOS, you will need to run `pod install`, and on Android, you will also need Android NDK to be installed ([see here](#android)). 

## Testing with Jest

In order to load the mock provided by React Native Skia add following to your jest config:

```json
"setupFiles": ["./node_modules/@shopify/react-native-skia/jestSetup.js"]
```

Example:

```json
"jest": {
  "preset": "react-native",
  "setupFiles": ["./node_modules/@shopify/react-native-skia/jestSetup.js"]
}
```


