---
id: web
title: Web Support
sidebar_label: Web
slug: /getting-started/web
---

React Native Skia runs in a web browser thanks to [CanvasKit](https://skia.org/docs/user/modules/canvaskit/), a WebAssembly build of Skia.
The WebAssembly file is loaded asynchronously and has a size of 7.9MB.
While this is a substantial file size, you have control over the user experience: you can decide when to load Skia and how the loading experience should be.

We provide direct integrations with [Expo](#Expo) and [Remotion](#Remotion).
Below you will also find the manual installation steps to run the module on any React Native Web projects.

## Expo

Using React Native Skia on Expo web is reasonably straightforward.
We provide a script that will work well with the setup:
```bash
$ expo install @shopify/react-native-skia
$ yarn setup-skia-web
```

Once you are done, you need to pick your strategy to [Load Skia](#loading-skia).

If you are [loading CanvasKit from a CDN](#using-a-cdn), you don't need to run the `setup-skia-web` script. If you are not using `react-native-reanimated`, webpack will output a warning because React Native Skia refers to Reanimated. We describe how to fix this warning [here](#manual-webpack-installation).

## Remotion

To use React Native Skia with Remotion, please follow [the following installation steps](https://remotion.dev/skia).

## Manual Webpack Installation

To run React Native Skia on Web, you need to do three things:
* Make sure that the WebAssembly file is available from the build system. This can easily be done using the [webpack copy plugin](https://webpack.js.org/plugins/copy-webpack-plugin/). Another option is to [load CanvasKit from a CDN](#using-a-cdn).
* Configure the build system to resolve the following two node modules: `fs` and `path`. One way to do it is to use the [node polyfill plugin](https://www.npmjs.com/package/node-polyfill-webpack-plugin).
* If you are not using the `react-native-reanimated`, Webpack will throw a warning since React Native Skia refers to that module.

So following is an example of a Webpack v5 configuration that supports React Native Skia.
These three steps can easily be adapted to your build system.

```tsx
import CopyPlugin from "copy-webpack-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";

const newConfiguration = {
  ...currentConfiguration,
  plugins: [
    ...currentConfiguration.plugins,
    // 1. Make the wasm file available to the build system
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/canvaskit-wasm/bin/full/canvaskit.wasm",
        },
      ],
    }),
    // 2. Polyfill fs and path module from node
    new NodePolyfillPlugin()
  ],
  externals: {
    ...currentConfiguration.externals,
    // 3. Avoid warning if reanimated is not present
    "react-native-reanimated": "require('react-native-reanimated')",
    "react-native-reanimated/lib/reanimated2/core":
      "require('react-native-reanimated/lib/reanimated2/core')",
  },
}
```

Last, you need to [load Skia](#loading-skia).

## Loading Skia

You need to have Skia fully loaded and initialized before importing the Skia module.
There are two ways you can control the way Skia should load:
* With `<WithSkiaWeb />`: using code-splitting to defer loading the components that import Skia.
* With `LoadSkiaWeb()`: deferring the root component registration until Skia is loaded.

### Using Code-Splitting

We provide a `<WithSkiaWeb>` component which leverages [code splitting](https://reactjs.org/docs/code-splitting.html). In the example below, we load Skia before loading the `MySkiaComponent` component. 

```tsx
import React from 'react';
import { Text } from "react-native";
// Notice the import path `@shopify/react-native-skia/lib/module/web`
// This is important only to pull the code responsible for loading Skia.
// @ts-expect-error
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export default function App() {
  return (
    <WithSkiaWeb
      getComponent={() => import("./MySkiaComponent")}
      fallback={<Text>Loading Skia...</Text>} />}
  );
}
```

### Using Defered Component Registration

We provide a `LoadSkiaWeb()` function you can use to load Skia before starting the React app.
This is the approach we use for Remotion, for instance.
The following is an example of an `index.web.js` file.

```tsx
// Notice the import path `@shopify/react-native-skia/lib/module/web`
// This is important only to pull the code responsible for loading Skia.
// @ts-expect-error
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

LoadSkiaWeb().then(async () => {
  const App = (await import("./src/App")).default;
  AppRegistry.registerComponent("Example", () => App);
});
```

## Using a CDN

Another option is to load CanvasKit from a CDN.
This is useful to load Skia Web without having to modify your build steps.
It is imperative that you are using the exact same version of CanvasKit as the one used by React Native Skia.

In the example below we load CanvasKit from a CDN using code-splitting.

```tsx
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { version } from 'canvaskit-wasm/package.json';

export default function App() {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${version}/bin/full/${file}` }}
      getComponent={() => import("./MySkiaComponent")}
  );
}
```

Below is the same example but using defered component registration.
 
 ```tsx
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { version } from 'canvaskit-wasm/package.json';

LoadSkiaWeb({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${version}/bin/full/${file}`
}).then(async () => {
  const App = (await import("./src/App")).default;
  AppRegistry.registerComponent("Example", () => App);
});
```

## Unsupported Features

Below are the React Native Skia APIs which are not yet supported on React Native Web.
Some of these features are a work in progress, and some others will come later.

**Work in Progress**

* `ColorFilter::MakeLuma`
* `ImageFilter::MakeBlend`
* `ImageFilter::MakeDilate`
* `ImageFilter::MakeErode`
* `ImageFilter::MakeDropShadowOnly`
* `ImageFilter::MakeDropShadow`
* `ImageFilter::MakeDisplacementMap`
* `ImageFilter::MakeOffset`

**Coming soon**

* `Font::GetPath`
* `ImageFilter::MakeShader`
* `ShaderFilter`

**Unplanned**

* `ImageSvg`
