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
| ref?   | `Ref<CanvasRef>` | Reference to the canvas (see [canvas size](#canvas-size) and [snapshots](#snapshots)) |
| onSize? | `SharedValue<Size>` | Reanimated value to which the canvas size will be assigned  (see [canvas size](#canvas-size)) |
| opaque? | `boolean` | Declares that the canvas covers every pixel of its bounds. Defaults to `false`. On Android it selects the cheapest backing view (see [Android rendering options](#android-rendering-options)) |
| android? | `AndroidCanvasProps` | Android-only rendering options, ignored on iOS and web (see [Android rendering options](#android-rendering-options)) |
| highBitDepth? | `boolean` | Render into a surface with more than 8 bits per channel (see [high bit depth](#high-bit-depth)) |

## Canvas size

The size of the canvas is available on both the UI and JS thread.

### UI thread

The `onSize` property receives a shared value, which will be updated whenever the canvas size changes.
You can see it in action in the example below.

```tsx twoslash
import {useSharedValue, useDerivedValue} from "react-native-reanimated";
import {Fill, Canvas, Rect} from "react-native-skia";

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
import {Fill, Canvas, Rect, useCanvasSize} from "react-native-skia";

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
import {Fill, Canvas, Rect, useCanvasRef} from "react-native-skia";

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


## Android rendering options

On iOS, the canvas draws into a `CAMetalLayer` and behaves like any other view.
Android has no single view type that is both cheap and composited like a regular view, so the canvas can be backed by one of two native views.
The `android` prop selects it; it is ignored on iOS and web.

| Option | Type | Effect |
| --- | --- | --- |
| `surfaceType` | `"SurfaceView" \| "TextureView"` | Backing view. Defaults to `SurfaceView` when the canvas is `opaque` and to `TextureView` otherwise |
| `zOrderOnTop` | `boolean` | `SurfaceView` only: composites above every React Native view in the window. Defaults to `false` |

**`SurfaceView`** is the default for an opaque canvas and the fastest path.
Each frame goes straight to the system compositor as its own layer, with no extra copy and no involvement of the React Native view hierarchy.
The price is that it is not really view content: it punches a hole through the window, so parent transforms, clipping, rounded corners, and z-ordering with sibling views do not apply to it.
Use it whenever the canvas is a plain opaque rectangle.

**`TextureView`** is the default for a non-opaque canvas.
It is a regular Android view: frames go through a `SurfaceTexture` that the UI toolkit samples as a texture when it draws the view, so parent transforms, clipping, alpha, and z-order all apply and the canvas can be composited over other React Native views.
That routing costs an extra texture copy and typically a frame of latency, and it can stall during some view animations.

| | `SurfaceView` | `TextureView` |
| --- | --- | --- |
| Composited like a regular view | no | yes |
| Extra copy | none | one |
| Latency | lowest | one frame more |
| Selected when | `opaque` (default) | `opaque={false}` (default) |

`opaque` applies to whichever view is selected: on a `SurfaceView` it picks `PixelFormat.OPAQUE` or `PixelFormat.TRANSLUCENT`, on a `TextureView` it calls `setOpaque`.
Changing `opaque` at runtime updates the view in place; changing `surfaceType` or `zOrderOnTop` replaces the backing view, which recreates its surface.

The defaults composite correctly in React Native stacking order without further flags.
Set `surfaceType` when you need a different trade-off:

```tsx twoslash
import {Canvas, Fill} from "react-native-skia";

// Opaque TextureView: stays in stacking order, e.g. inside a ScrollView
export const InScrollView = () => (
  <Canvas style={{ flex: 1 }} opaque android={{ surfaceType: "TextureView" }}>
    <Fill color="cyan" />
  </Canvas>
);

// Translucent SurfaceView above every React Native view, no composition pass
export const Overlay = () => (
  <Canvas
    style={{ flex: 1 }}
    android={{ surfaceType: "SurfaceView", zOrderOnTop: true }}
  >
    <Fill color="rgba(0, 255, 255, 0.5)" />
  </Canvas>
);
```

:::warning

A non-opaque `SurfaceView` without `zOrderOnTop` sits below the app window, so its alpha blends against the window background (usually black) and the React Native views beneath it are punched out.
Pair it with `zOrderOnTop` to composite over React Native content, or keep the default `TextureView`.
`zOrderOnTop` draws above all React Native views in the window, including navigation screens, regardless of `zIndex`.

:::

A third backend that keeps `TextureView`'s compositing behavior without its extra copy, by drawing each frame's `AHardwareBuffer` inline (as React Native WebGPU's `HardwareBufferView` does), is planned for the Graphite backend.

## High bit depth

By default the canvas renders into an 8-bit surface. With only 256 levels per channel, subtle gradients quantize into visible bands, especially in dark tones and on OLED displays.
With `highBitDepth`, the canvas renders into a 16-bit float surface on iOS and a 10-bit surface on Android.
Colors are identical to the default surface, only with more precision: this is about bit depth, not HDR.

```tsx twoslash
import {Canvas, Fill, LinearGradient, vec} from "react-native-skia";

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

On Android, `highBitDepth` requires an opaque `SurfaceView` (the default for `opaque`): the 10-bit format only has 2 bits of alpha, and a `TextureView` composites through an 8-bit pass anyway.
When the surface does not support the 10-bit format, the canvas falls back to 8-bit.

:::

## Getting a Canvas Snapshot

You can save your drawings as an image by using the `makeImageSnapshotAsync` method. This method returns a promise that resolves to an [Image](/docs/images).
It executes on the UI thread, ensuring access to the same Skia context as your on-screen canvases, including [textures](https://shopify.github.io/react-native-skia/docs/animations/textures).

If your drawing does not contain textures, you may also use the synchronous `makeImageSnapshot` method for simplicity.

### Example

```tsx twoslash
import {useEffect} from "react";
import {Canvas, useCanvasRef, Circle} from "react-native-skia";

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
