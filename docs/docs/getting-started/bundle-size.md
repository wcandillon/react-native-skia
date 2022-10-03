---
id: bundle-size
title: Bundle Size
sidebar_label: Bundle Size
slug: /getting-started/bundle-size
---

Below is the app size increase to be expected when adding React Native Skia to your project.

| iOS  | Android | Web    |
| ---- | ------- | ------ |
| 6 MB | 4 MB    | 7,2 MB |

React Native Skia includes both prebuilt library files and C++ files that are compiled and linked with your app when being built - adding to the size of your app.

For a regular arm 64-bit **Android** device, the increased download size will be around **4 MB** added after adding React Native Skia - on **iOS**, the increased download size will be around **6 MB**.

On **Web**, the increase will be around **7,2 MB**, which can be reduced by distributing the included CanvasKit Web Assembly file through a CDN ([learn more](web)).

Below is an explanation of how these numbers were found - using a bare-bones React Native app created with `npx react-native init` before and after adding React Native Skia.

## Android

_On *Android* you should use [App Bundles](https://developer.android.com/guide/app-bundle) to ensure that only the required files are downloaded to your user’s devices._

When building an APK in release mode, you will see an increase of 41.3 MB after adding React Native Skia.
This is because the library is built for different target architectures.
If we take `arm-64-bit` for instance, the `libreactskia.so` library file is only around 3,8 MB.

This implies that if you distribute your apps using [App Bundles](https://developer.android.com/guide/app-bundle), the increase in download size should be around 4 MB on Android devices when distributed (including an increase of 220 KB to the Javascript Bundle).

### iOS

Unlike Android, there is no standard way to find the app size increase on iOS - but by archiving and distributing our build using the Ad-Hoc distribution method, we'll find some numbers in the report "App Thinning Size.txt":

**Base app:** 2,6 MB compressed, 7,2 MB uncompressed<br />
**With React Native Skia:** 5,2 MB compressed, 13 MB uncompressed

Meaning that we’ve increased the size of our app by around 5,8 MB after adding React Native Skia. If we add the increased Javascript bundle of about 220 KB, we end up with about 6 MB of increased download size after including React Native Skia.

### NPM Package

The NPM download is much bigger than these numbers indicate because we need to distribute Skia for all target platforms.
On iOS, it is also required to distribute the bitcode (intermediate representation of a compiled program that can be used to recompile the program). This requirement will be removed in the future.
