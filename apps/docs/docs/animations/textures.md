---
id: textures
title: Textures
sidebar_label: Textures
slug: /animations/textures
---

A texture is an image that lives on the GPU.
React Native Skia provides hooks that create textures off the JS thread and expose them as Reanimated shared values.

With Graphite, textures are shared between threads: a texture created on one thread can be drawn by any canvas and from any runtime.
A texture belongs to the GPU device, which [can be lost](/docs/webgpu#device-loss) while the app runs: the hooks make theirs again on the new device, and `useGpu()` lets a texture of your own do the same.

## `useTexture`

This hook allows you to create textures from React elements.
It takes a React element and the dimensions of the texture as arguments and returns a Reanimated shared value that contains the texture.

```tsx twoslash
import { useWindowDimensions } from "react-native";
import { useTexture } from "react-native-skia";
import { Image, Rect, rect, Canvas, Fill } from "react-native-skia";
import React from "react";

const Demo = () => {
  const {width, height} = useWindowDimensions();
  const texture = useTexture(
      <Fill color="cyan" />,
    { width, height }
  );
  return (
    <Canvas style={{ flex: 1 }}>
      <Image image={texture} rect={{ x: 0, y: 0, width, height }} />
    </Canvas>
  )
}
```

## `useImageAsTexture`

This hook allows you to upload an image to the GPU.
It accepts an image source as argument.
It loads and decodes the image off the JS thread, like [`useImage`](/docs/images#useimage), then uploads it with `makeTextureImage()` on the UI thread.
The upload is paid before the first frame that draws the image, and the texture is held for as long as the image; see [GPU and CPU images](/docs/images#gpu-and-cpu-images).

```tsx twoslash
import { useWindowDimensions } from "react-native";
import { useImageAsTexture } from "react-native-skia";
import { Image, Rect, rect, Canvas, Fill } from "react-native-skia";
import React from "react";

const Demo = () => {
  const {width, height} = useWindowDimensions();
  const texture = useImageAsTexture(
    require("./assets/image.png")
  );
  return (
    <Canvas style={{ flex: 1 }}>
      <Image image={texture} rect={{ x: 0, y: 0, width, height }} />
    </Canvas>
  )
}
```

## `usePictureAsTexture`

The hook allows you to create a texture from an `SkPicture`.
This is useful to either generate the drawing commands outside the React lifecycle or using the imperative API to build a texture.

```tsx twoslash
import {useWindowDimensions} from "react-native";
import { usePictureAsTexture } from "react-native-skia";
import { Image, Rect, rect, Canvas, Fill, Skia } from "react-native-skia";
import React from "react";

const rec = Skia.PictureRecorder();
const canvas = rec.beginRecording();
canvas.drawColor(Skia.Color("cyan"));
const picture = rec.finishRecordingAsPicture();

const Demo = () => {
  const {width, height} = useWindowDimensions();
  const texture = usePictureAsTexture(
    picture,
    { width, height }
  );
  return (
    <Canvas style={{ flex: 1 }}>
      <Image image={texture} rect={{ x: 0, y: 0, width, height }} />
    </Canvas>
  )
}
```

## Under the hood

React Native Worklets provides a [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI) function that enables the execution of JavaScript code on the UI thread. The hooks above use it to create GPU textures without blocking the JS thread.

```tsx twoslash
import { useEffect } from "react";
import { useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import { Skia, Canvas, Image } from "react-native-skia";
import type { SkImage } from "react-native-skia";

const createTexture = (image: SharedValue<SkImage | null>) => {
  "worklet";
  const surface = Skia.Surface.MakeOffscreen(200, 200)!;
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color("cyan"));
  surface.flush();
  image.value = surface.makeImageSnapshot();
}

const Demo = () => {
  const image = useSharedValue<SkImage | null>(null);
  useEffect(() => {
    scheduleOnUI(createTexture, image);
  }, []);
  
  return (
    <Canvas style={{ flex: 1 }}>
      <Image image={image} x={0} y={0} width={200} height={200} />
    </Canvas>
  );
};
```

This example demonstrates how to create a texture, draw a cyan color onto it, and then display it using the `Image` component from `react-native-skia`. The `scheduleOnUI` function ensures that the texture creation and drawing operations are performed on the UI thread.

Since textures are shared between threads, you can also create one directly on the JS thread, without Reanimated:

```tsx twoslash
import { useMemo } from "react";
import { Skia, Canvas, Image } from "react-native-skia";

const Demo = () => {
  const image = useMemo(() => {
    const surface = Skia.Surface.MakeOffscreen(200, 200)!;
    const canvas = surface.getCanvas();
    canvas.drawColor(Skia.Color("cyan"));
    surface.flush();
    return surface.makeImageSnapshot();
  }, []);

  return (
    <Canvas style={{ flex: 1 }}>
      <Image image={image} x={0} y={0} width={200} height={200} />
    </Canvas>
  );
};
```

## Surfaces drawn every frame

`makeImageSnapshot()` copies the texture of the surface. A surface redrawn on every frame does not need a copy per frame: `asImage()` returns an image sharing its texture, once.
Draw into the surface, flush it, and whatever samples the image on the next frame sees the new content.

```tsx twoslash
import { useMemo } from "react";
import { useSharedValue, useFrameCallback } from "react-native-reanimated";
import { Skia, Canvas, Image, useGpu } from "react-native-skia";

const Demo = () => {
  // Both are made again once a lost GPU device has been replaced.
  const gpu = useGpu();
  const surface = useMemo(() => Skia.Surface.MakeOffscreen(200, 200)!, [gpu]);
  // The image is created once per surface and follows it.
  const image = useMemo(() => surface.asImage(), [surface]);
  const t = useSharedValue(0);
  useFrameCallback((frame) => {
    "worklet";
    const canvas = surface.getCanvas();
    canvas.drawColor(Skia.Color("black"));
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("cyan"));
    canvas.drawCircle(100 + 50 * Math.cos(frame.timestamp / 500), 100, 32, paint);
    surface.flush();
    t.value = frame.timestamp;
  });
  return (
    <Canvas style={{ flex: 1 }}>
      <Image image={image} x={0} y={0} width={200} height={200} />
    </Canvas>
  );
};
```

Never draw the image onto its own surface: use a second surface for a feedback loop.

:::info

On the Web, a texture belongs to the WebGL context that created it, and each canvas has its own context.
Call `makeRasterImageSync()` on the snapshot before drawing it in a canvas. The texture hooks do it for you, and `asImage()` is a snapshot there.

:::

Textures can also be shared with WebGPU: see [WebGPU](/docs/webgpu).
