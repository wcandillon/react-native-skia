---
id: canvas
title: Canvas
sidebar_label: Overview
slug: /canvas/overview
---

The Canvas component is the root of your Skia drawing.
You can treat it as a regular React Native view and assign a view style.
Behind the scenes, it is using its own React renderer.

| Name | Type     |  Description    |
|:-----|:---------|:-----------------|
| style?   | `ViewStyle` | View style |
| ref?   | `Ref<SkiaView>` | Reference to the `SkiaView` object |
| onSize? | `SharedValue<Size>` | Reanimated value to which the canvas size will be assigned  (see [canvas size](#canvas-size)) |
| highBitDepth? | `boolean` | Render into a surface with more than 8 bits per channel (see [high bit depth](#high-bit-depth)) |
| androidWarmup? | `boolean` | Draw the first frame directly on the Android compositor. Use it for static icons or fully opaque drawings—animated or translucent canvases can misrender, so it remains opt-in. |

## Canvas size

The size of the canvas is available on both the UI and JS thread.

### UI thread

The `onSize` property receives a shared value, which will be updated whenever the canvas size changes.
You can see it in action in the example below.

```tsx twoslash
import {useSharedValue, useDerivedValue} from "react-native-reanimated";
import {Fill, Canvas, Rect} from "@shopify/react-native-skia";

const Demo = () => {
  // size will be updated as the canvas size changes
  const size = useSharedValue({ width: 0, height: 0 });
  const rect = useDerivedValue(() => {
    const {width, height} = size.value;
    return { x: 0, y: 0, width, height };
  });
  return (
    <Canvas style={{ flex: 1 }} onSize={size}>
      <Rect color="cyan" rect={rect} />
    </Canvas>
  );
};
```

### JS thread

To get the canvas size on the JS thread, you can use `useLayoutEffect` and `measure()`.
Since this is a very common pattern, we offer a `useCanvasSize` hook you can use for convenience.

```tsx twoslash
import {Fill, Canvas, Rect, useCanvasSize} from "@shopify/react-native-skia";

const Demo = () => {
  const {ref, size: {width, height}} = useCanvasSize();
  return (
    <Canvas style={{ flex: 1 }} ref={ref}>
      <Rect color="cyan" rect={{ x: 0, y: 0, width, height }} />
    </Canvas>
  );
};
```

This example is equivalent to the code below:

```tsx twoslash
import {useLayoutEffect, useState} from "react";
import {Fill, Canvas, Rect, useCanvasRef} from "@shopify/react-native-skia";

const Demo = () => {
  const ref = useCanvasRef();
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  useLayoutEffect(() => {
    ref.current?.measure((_x, _y, width, height) => {
      setRect({ x: 0, y: 0, width, height });
    });
  }, []);
  return (
    <Canvas style={{ flex: 1 }} ref={ref}>
      <Rect color="cyan" rect={rect} />
    </Canvas>
  );
};
```


## High bit depth

By default the canvas renders into an 8-bit surface. With only 256 levels per channel, subtle gradients quantize into visible bands, especially in dark tones and on OLED displays.
With `highBitDepth`, the canvas renders into a 16-bit float surface on iOS and a 10-bit surface on Android.
Colors are identical to the default surface, only with more precision: this is about bit depth, not HDR.

```tsx twoslash
import {Canvas, Fill, LinearGradient, vec} from "@shopify/react-native-skia";

const Demo = () => {
  return (
    <Canvas style={{ flex: 1 }} opaque highBitDepth>
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, 512)}
          colors={["rgb(51, 56, 77)", "rgb(59, 64, 85)"]}
        />
      </Fill>
    </Canvas>
  );
};
```

:::warning

On Android, `highBitDepth` requires the Graphite backend; with the default OpenGL backend the canvas falls back to 8-bit.

:::

## Getting a Canvas Snapshot

You can save your drawings as an image by using the `makeImageSnapshotAsync` method. This method returns a promise that resolves to an [Image](/docs/images).
It executes on the UI thread, ensuring access to the same Skia context as your on-screen canvases, including [textures](https://shopify.github.io/react-native-skia/docs/animations/textures).

If your drawing does not contain textures, you may also use the synchronous `makeImageSnapshot` method for simplicity.

### Example

```tsx twoslash
import {useEffect} from "react";
import {Canvas, useCanvasRef, Circle} from "@shopify/react-native-skia";

export const Demo = () => {
  const ref = useCanvasRef();
  useEffect(() => {
    setTimeout(() => {
      // you can pass an optional rectangle
      // to only save part of the image
      const image = ref.current?.makeImageSnapshot();
      if (image) {
        // you can use image in an <Image> component
        // Or save to file using encodeToBytes -> Uint8Array
        const bytes = image.encodeToBytes();
        console.log({ bytes });
      }
    }, 1000)
  });
  return (
    <Canvas style={{ flex: 1 }} ref={ref}>
      <Circle r={128} cx={128} cy={128} color="red" />
    </Canvas>
  );
};
```

## Accessibility

The Canvas component supports the same properties as a View component including its [accessibility properties](https://reactnative.dev/docs/accessibility#accessible).
You can make elements inside the canvas accessible as well by overlaying views on top of your canvas.
This is the same recipe used for [applying gestures on specific canvas elements](https://shopify.github.io/react-native-skia/docs/animations/gestures/#element-tracking).
