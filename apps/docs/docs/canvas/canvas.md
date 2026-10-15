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
| ref?   | `Ref<CanvasRef>` | Reference to the canvas (see [size](#one-off-reads) and [snapshots](#getting-a-canvas-snapshot)) |
| onLayout? | `(event: LayoutChangeEvent) => void` | Called with the layout of the canvas whenever it changes (see [canvas size](#canvas-size)) |
| opaque? | `boolean` | Declares that the canvas covers every pixel of its bounds. Defaults to `false`. On Android it selects the cheapest backing view (see [Android rendering options](#android-rendering-options)) |
| android? | `AndroidCanvasProps` | Android-only rendering options, ignored on iOS and web (see [Android rendering options](#android-rendering-options)) |
| highBitDepth? | `boolean` | Render into a surface with more than 8 bits per channel (see [high bit depth](#high-bit-depth)) |

## Canvas size

The canvas is a regular React Native view: its size is the one of its layout, in points, and `onLayout` reports it whenever it changes.
There is no other size to track.
This is the model of [React Native WebGPU](https://wcandillon.github.io/react-native-webgpu/api/canvas#pixel-density), whose canvas exposes `clientWidth` and `clientHeight`, and of the [Graphite View](/docs/canvas/graphite), whose context exposes `width` and `height`.

### JS thread

The `useCanvasSize` hook wraps `onLayout`: pass its `onLayout` to the canvas, and `size` follows the layout.
It is `0x0` until the canvas is laid out.

```tsx twoslash
import {Canvas, Rect, useCanvasSize} from "react-native-skia";

const Demo = () => {
  const { size: { width, height }, onLayout } = useCanvasSize();
  return (
    <Canvas style={{ flex: 1 }} onLayout={onLayout}>
      <Rect color="cyan" rect={{ x: 0, y: 0, width, height }} />
    </Canvas>
  );
};
```

This example is equivalent to the code below:

```tsx twoslash
import {useState} from "react";
import {Canvas, Rect} from "react-native-skia";

const Demo = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <Canvas
      style={{ flex: 1 }}
      onLayout={({ nativeEvent: { layout: { width, height } } }) =>
        setSize({ width, height })
      }
    >
      <Rect color="cyan" rect={{ x: 0, y: 0, ...size }} />
    </Canvas>
  );
};
```

### One-off reads

For a single read, in an event handler for instance, `size` on the canvas ref is the current layout, read synchronously.
It is the layout size, without the transforms applied to the view, and `0x0` before the canvas is mounted.

```tsx twoslash
import {Canvas, useCanvasRef, Fill} from "react-native-skia";

const Demo = () => {
  const ref = useCanvasRef();
  const logSize = () => {
    console.log(ref.current?.size);
  };
  return (
    <Canvas ref={ref} style={{ flex: 1 }} onTouchEnd={logSize}>
      <Fill color="cyan" />
    </Canvas>
  );
};
```

### UI thread

To use the size in Reanimated values, write the layout into a shared value.
The values derived from it are updated on every layout change, and the canvas is redrawn with them without any further work on the JS thread.

```tsx twoslash
import {useSharedValue, useDerivedValue} from "react-native-reanimated";
import {Canvas, Rect} from "react-native-skia";

const Demo = () => {
  const size = useSharedValue({ width: 0, height: 0 });
  const rect = useDerivedValue(() => {
    const {width, height} = size.value;
    return { x: 0, y: 0, width, height };
  });
  return (
    <Canvas
      style={{ flex: 1 }}
      onLayout={({ nativeEvent: { layout } }) => {
        size.value = { width: layout.width, height: layout.height };
      }}
    >
      <Rect color="cyan" rect={rect} />
    </Canvas>
  );
};
```

The layout event goes through the JS thread, so the first frame drawn with a new size can follow the resize by a frame.
A frame loop on a [Graphite View](/docs/canvas/graphite) does not need it: the `width` and `height` of its context follow the layout on every read.

## How frames are produced

The children of a `Canvas` are rendered by Skia's own React renderer, and its frames are produced off the JS thread:

1. On every React commit, the JS thread records the drawing into a native display list and hands it to the view.
2. When a Reanimated value used by the drawing changes, the UI thread writes the new value into the display list. It does not draw anything.
3. A dedicated native thread pool replays the display list into a Graphite frame whenever its content changed, at most once per presented frame.
4. The view presents the frame on the next vsync.

An animation frame costs no React render, no work on the JS thread, and no drawing on the UI thread.
A canvas without animation values is drawn once, and the view keeps its frame.

On the Web, the drawing is recorded into a picture on the JS thread and painted on a WebGL canvas.

If you need to produce the frames yourself, from the thread of your choice, use the [Graphite View](/docs/canvas/graphite).

## Android rendering options

On iOS, the canvas draws into a `CAMetalLayer` and behaves like any other view.
Android has no single view type that is both cheap and composited like a regular view, so the canvas can be backed by one of two native views.
The `android` prop selects it; it is ignored on iOS and web.

| Option | Type | Effect |
| --- | --- | --- |
| `surfaceType` | `"SurfaceView" \| "TextureView"` | Backing view. Defaults to `SurfaceView` when the canvas is `opaque` (from Android 12L, see below) and to `TextureView` otherwise |
| `zOrderOnTop` | `boolean` | `SurfaceView` only: composites above every React Native view in the window. Defaults to `false` |

**`SurfaceView`** is the default for an opaque canvas from Android 12L and the fastest path.
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
| Selected when | `opaque`, from Android 12L (default) | `opaque={false}`, or `opaque` before Android 12L (default) |

Before Android 12L, a `SurfaceView` loses its layer as soon as it leaves the window, a frame before the window stops showing the hole it punched, so an opaque canvas leaving the screen flashes black.
On those releases an opaque canvas is therefore backed by a `TextureView`, unless it sets `zOrderOnTop` or `highBitDepth`, which only a `SurfaceView` provides.
`surfaceType: "SurfaceView"` still selects a `SurfaceView` there.

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

A third backend that keeps `TextureView`'s compositing behavior without its extra copy, by drawing each frame's `AHardwareBuffer` inline (as React Native WebGPU's `HardwareBufferView` does), is planned.

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

On Android, `highBitDepth` requires an opaque `SurfaceView` (what an `opaque` canvas with `highBitDepth` gets by default): the 10-bit format only has 2 bits of alpha, and a `TextureView` composites through an 8-bit pass anyway.
When the surface does not support the 10-bit format, the canvas falls back to 8-bit.

:::

## Color space

On Apple devices with a wide color gamut display, the canvas renders in the Display P3 color space.
On other devices, on Android, and on the Web, it renders in sRGB.

Colors are managed: a color or an image looks the same in both color spaces.
Display P3 adds the colors that sRGB cannot represent, for instance the ones of a photo with a Display P3 profile.

:::info

The colors returned by a [shader](/docs/shaders/overview) are not managed. They are interpreted in the color space of the canvas: the same values look more saturated in Display P3 than in sRGB.

:::

[Snapshots](#getting-a-canvas-snapshot) are always in sRGB.

## Getting a Canvas Snapshot

You can save your drawings as an image by using the `makeImageSnapshot` method, which returns an [Image](/docs/images).
The drawing is rendered into an offscreen surface with its latest animation values, on the calling thread: the snapshot does not wait for the next frame.
The image lives on the GPU: drawing it in another canvas costs no copy, and [textures](/docs/animations/textures) in the drawing are supported.
Encoding it or reading its pixels waits for the GPU; to do that without blocking, read it back first with `makeRasterImage()` (see [images](/docs/images#gpu-and-cpu-images)).

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
This is the same recipe used for [applying gestures on specific canvas elements](/docs/animations/gestures#element-tracking).
