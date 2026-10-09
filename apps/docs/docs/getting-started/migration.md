---
id: migration
title: Migrating to v3
sidebar_label: Migrating to v3
slug: /getting-started/migration
---

React Native Skia v3 renders with Skia Graphite on iOS, macOS, and Android.
Graphite is Skia's new GPU backend. In React Native Skia it runs on [Dawn](https://dawn.googlesource.com/dawn), Google's WebGPU implementation, which uses Metal on Apple platforms and Vulkan on Android.

:::info[Staying on v2]

v2 is still maintained. It renders with OpenGL ES on Android and has lower version requirements: it runs on Android devices below API level 26 or without Vulkan, and it supports Android TV and Expo Go.
If you need any of these, stay on v2 (`yarn add react-native-skia@2`) and use the [v2 documentation](https://wcandillon.github.io/react-native-skia/v2/).

:::

The drawing API is the same as in v2: components, hooks, shaders, and the imperative `Skia` API all work as before.
What changes is the package name, the platform requirements, and a few `Canvas` props.
Most apps migrate in three steps, and a fourth one applies to apps that play videos or draw camera frames:

1. [Rename the package](#1-rename-the-package)
2. [Check the platform requirements](#2-check-the-platform-requirements)
3. [Update the Canvas props](#3-update-the-canvas-props)
4. [Replace the removed APIs](#4-replace-the-removed-apis)

## 1. Rename the package

The package is now published as `react-native-skia`. `@shopify/react-native-skia` stops at version 2.14.
If your project already depends on `react-native-skia` (2.15), skip to the [next step](#2-check-the-platform-requirements).

```sh
yarn remove @shopify/react-native-skia
yarn add react-native-skia
```

Then update the imports, including the deep imports used on [Web](/docs/getting-started/web) and in [headless](/docs/getting-started/headless) mode:

```diff
- import { Canvas, Circle } from "@shopify/react-native-skia";
- import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
+ import { Canvas, Circle } from "react-native-skia";
+ import { LoadSkiaWeb } from "react-native-skia/lib/module/web";
```

The following command rewrites every import of a git repository in one go:

```sh
git grep -l "@shopify/react-native-skia" -- '*.ts' '*.tsx' '*.js' '*.jsx' \
  | xargs perl -pi -e 's#\@shopify/react-native-skia#react-native-skia#g'
```

The Jest configuration references the package by name as well:

```diff
// jest.config.js
module.exports = {
-  testEnvironment: "@shopify/react-native-skia/jestEnv.js",
-  setupFilesAfterEnv: ["@shopify/react-native-skia/jestSetup.js"],
+  testEnvironment: "react-native-skia/jestEnv.js",
+  setupFilesAfterEnv: ["react-native-skia/jestSetup.js"],
  transformIgnorePatterns: [
-    "node_modules/(?!(react-native|react-native.*|@react-native.*|@?react-navigation.*|@shopify/react-native-skia)/)"
+    "node_modules/(?!(react-native|react-native.*|@react-native.*|@?react-navigation.*|react-native-skia)/)"
  ],
};
```

:::warning

Do not install `@shopify/react-native-skia` and `react-native-skia` side by side: both ship the same native module.
A library that imports from `@shopify/react-native-skia` needs a release that targets `react-native-skia` before you can use it with v3.

:::

## 2. Check the platform requirements

### Android

v3 requires Android API level 26 or above and renders with Vulkan instead of OpenGL ES.
React Native projects default to a lower `minSdkVersion`, so raise it in `android/build.gradle`:

```groovy
buildscript {
    ext {
        minSdkVersion = 26
    }
}
```

### iOS, tvOS, and macOS

The minimum deployment target is iOS 15.1.
Run `pod install` again after upgrading: the Skia binaries come from new npm packages (`react-native-skia-graphite-apple-ios`, `react-native-skia-graphite-apple-tvos`, `react-native-skia-graphite-apple-macos`), alongside `react-native-webgpu-dawn`.

### Expo

Expo Go bundles the native code of v2, so v3 needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/):

```sh
npx expo install react-native-skia expo-build-properties
npx expo run:ios
npx expo run:android
```

Use [expo-build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/) to raise the Android `minSdkVersion`:

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", { "android": { "minSdkVersion": 26 } }]
    ]
  }
}
```

### Android TV

Android TV is not available with Graphite. It remains supported on v2.

### React Native WebGPU

If your app also uses [react-native-webgpu](https://github.com/wcandillon/react-native-webgpu), both packages now link the same copy of Dawn.
The native build fails with a Dawn version mismatch error if they were built against different Dawn releases: upgrade both packages together.
In exchange, Skia and WebGPU can now share a device and textures without any copy (see [WebGPU](/docs/webgpu)).

## 3. Update the Canvas props

Three props of `<Canvas>` were removed:

| Prop | Replacement |
|:--|:--|
| `debug` | None, remove the prop. |
| `colorSpace` | None, remove the prop. The canvas picks its [color space](/docs/canvas/overview#color-space) itself: Display P3 on Apple devices with a wide color gamut display (the default of v2), sRGB everywhere else. |
| `androidWarmup` | None, remove the prop. To control how the canvas is composited on Android, see the [Android rendering options](/docs/canvas/overview#android-rendering-options). |

The `NativeSkiaViewProps` type was removed as well.

## 4. Replace the removed APIs

Native buffers (camera and video frames) are now produced and owned by [React Native WebGPU](https://wcandillon.github.io/react-native-webgpu/), and Skia only wraps them.
The following APIs were removed in favor of it:

| Removed | Replacement |
|:--|:--|
| `Skia.Video()` and `useVideo()` | React Native WebGPU's `createVideoPlayer()`, whose frames are copied into a texture that Skia draws. See [native buffers](/docs/webgpu#native-buffers). |
| `Skia.NativeBuffer.MakeFromImage()` | Export the image as a WebGPU texture with `Skia.Image.MakeGPUTextureFromImage()`. See [exporting an image](/docs/webgpu#exporting-an-image). |
| `Skia.NativeBuffer.MakeTestBuffer()` | React Native WebGPU's `createTestVideoFrame()`. |
| `Skia.NativeBuffer.Release()` | `NativeVideoFrame.release()`: React Native WebGPU owns the buffers it hands out. |
| `Skia.Image.MakeImageFromNativeTextureUnstable()` | `Skia.Image.MakeImageFromGPUTexture(texture)`, which takes a WebGPU texture. See [WebGPU](/docs/webgpu). |
| `image.getNativeTextureUnstable()` and `surface.getNativeTextureUnstable()` | `Skia.Image.MakeGPUTextureFromImage()` and `Skia.Surface.MakeFromGPUTexture()`: textures are shared as WebGPU textures. |
| `Skia.Image.MakeImageFromNativeBuffer(pointer)` on native platforms | React Native WebGPU's `copyExternalImageToTexture()` renders the frame into a texture, which `Skia.Image.MakeImageFromGPUTexture()` wraps. See [native buffers](/docs/webgpu#native-buffers). The method remains on Web, where it takes a `CanvasImageSource`. |
| `ref.current.makeImageSnapshotAsync()` on a `Canvas` | `makeImageSnapshot()`: with Graphite the snapshot is taken on the calling thread and returns a GPU image. To encode it or read its pixels without blocking, read it back with `image.makeRasterImage()`. See [snapshots](/docs/canvas/overview#getting-a-canvas-snapshot). |

When an image cannot be decoded, `useImage()` now calls `onError` with the message `Could not decode the image` (it was `Could not load data`).

## What is new

### Rendering off the JS and UI threads

In v2, `<Canvas>` drew its frames on the UI thread.
In v3, the scene is recorded once per React commit, and a dedicated native thread pool replays it into a Graphite frame whenever its content changes.
The UI thread only applies the animated values, it no longer draws.
Nothing changes in your code: see [how frames are produced](/docs/canvas/overview#how-frames-are-produced).

### Textures can be used from any thread

With Ganesh, a GPU texture belonged to the Skia context of the thread that created it, which is why v2 created textures on the UI thread.
With Graphite, GPU-backed images are shared: an image created on the JS thread can be drawn by any canvas and from any worklet runtime.
The [texture hooks](/docs/animations/textures) work as before.

### SkiaGraphiteView

[`SkiaGraphiteView`](/docs/canvas/graphite) is a view that you drive frame by frame from any JavaScript runtime: the JS thread, the Reanimated UI runtime, or a dedicated worklet runtime.

### WebGPU interop

With [react-native-webgpu](https://github.com/wcandillon/react-native-webgpu) installed, Skia and WebGPU share the same GPU device.
You can draw a WebGPU texture in a Skia canvas, or draw with Skia into a texture that WebGPU samples, without any copy. This also works with three.js: see [WebGPU](/docs/webgpu).

### High bit depth on Android

The [`highBitDepth`](/docs/canvas/overview#high-bit-depth) prop is now supported on Android, where it renders into a 10-bit surface.

## Troubleshooting

**The Android build fails after upgrading.**
Check that `minSdkVersion` is 26 or above, then clean the native build (`cd android && ./gradlew clean`).

**The iOS build fails after upgrading.**
Run `pod install` again so CocoaPods picks up the new binary packages.

**The build reports a Dawn version mismatch.**
`react-native-skia` and `react-native-webgpu` were built against different Dawn releases. Upgrade both to their latest versions.

**The app does not run in Expo Go.**
Expo Go ships the native code of v2. Use a development build.

**The `Atlas` component is slower than in v2.**
Graphite draws an atlas one sprite at a time, where Ganesh drew it in a single GPU operation. See the [performance notes](/docs/shapes/atlas#performance) of the Atlas component.

**Screenshot tests report differences.**
Graphite is a different renderer than Ganesh, and its output can differ slightly. Review the differences and update your reference images.

If you run into an issue that is not listed here, please [open an issue](https://github.com/wcandillon/react-native-skia/issues/new/choose).
