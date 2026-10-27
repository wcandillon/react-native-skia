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
| android? | `AndroidCanvasProps` | Android-only rendering options: the native view behind the canvas and its options, ignored on iOS and web (see [Android rendering options](#android-rendering-options)) |
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
3. A dedicated native thread pool replays the display list into a Graphite frame whenever its content changed, keeping at most one frame ahead of the display.
4. The view presents the frame on the next vsync.

An animation frame costs no React render, no work on the JS thread, and no drawing on the UI thread.
A canvas without animation values is drawn once, and the view keeps its frame.

On the Web, the drawing is recorded into a picture on the JS thread and painted on a WebGL canvas.

If you need to produce the frames yourself, from the thread of your choice, use the [Graphite View](/docs/canvas/graphite).

## High refresh rate displays

The view presents at the rate of the display it is on, 120 Hz on a ProMotion iPhone or iPad.
Reanimated values and worklets run at the display's rate, so a canvas animated with them shows every frame the display can.

An app created from an Expo or React Native template before React Native 0.82 may still carry iOS's 60 Hz cap for iPhone: [Reanimated's performance guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/#-enable-120-fps) covers the `Info.plist` opt-in.

React Native's `requestAnimationFrame` on the JS thread runs at 60 Hz on iOS, so frames recorded from it, as in a [Graphite View](/docs/canvas/graphite) fed from the JS thread, are presented at that rate.

## Android rendering options

On iOS, the canvas draws into a `CAMetalLayer` and behaves like any other view.
Android has no single view type that is both cheap and composited like a regular view, so the canvas is backed by one of two native views, which the `android` prop names along with its options.
The prop is ignored on iOS and web.

| Option | Type | Effect |
| --- | --- | --- |
| `backingView` | `"TextureView" \| "SurfaceView" \| "HardwareBufferView"` | The native view behind the canvas. Defaults to `TextureView` |
| `opaque` | `boolean` | Declares that the canvas covers every pixel of its bounds, so it is composited without blending. Defaults to `false` on a `TextureView` and to `true` on a `SurfaceView`. Applied in place |
| `zOrderOnTop` | `boolean` | `SurfaceView` only: composites above every React Native view in the window. Defaults to `false` |
| `zOrderMediaOverlay` | `boolean` | `SurfaceView` only: composites above the other `SurfaceView`s below the window (video players, other canvases). Defaults to `false`; `zOrderOnTop` takes precedence |

**`TextureView`** is the default.
It is a regular Android view: frames go through a `SurfaceTexture` that the UI toolkit samples as a texture when it draws the view, so parent transforms, clipping, alpha, and z-order all apply, and the canvas composites over and under other React Native views.
That routing costs an extra texture copy and typically a frame of latency, and it can stall during some view animations.

**`SurfaceView`** is the fastest path.
Each frame goes straight to the system compositor as its own layer, with no extra copy and no involvement of the React Native view hierarchy.
The price is that it is not really view content: it punches a hole through the window, so parent transforms, clipping, rounded corners, and z-ordering with sibling views do not apply to it.
Use it for a canvas that is a plain rectangle: a full-screen scene, a game, a video-like surface.
On an adaptive display (Android 11 and later) the canvas asks for the display's highest refresh rate while it animates, as the window does for regular views, and lets the rate drop again once the animation stops.

**`HardwareBufferView`** is a plain view that draws each frame's `AHardwareBuffer` inline: composited like a `TextureView`, without its extra copy.
React Native WebGPU offers it as an opt-in on Android 10 and later; React Native Skia accepts the value, so both canvases take the same options, but does not implement it yet: the canvas uses a `TextureView`, with a warning in development.

| | `TextureView` | `SurfaceView` |
| --- | --- | --- |
| Composited like a regular view | yes | no |
| Extra copy | one | none |
| Latency | one frame more | lowest |
| Opaque by default | no | yes |

`opaque` is a compositing hint, applied in place whenever it changes.
On a `TextureView` it calls `setOpaque`, so the UI toolkit skips blending the view; on a `SurfaceView` it picks `PixelFormat.OPAQUE` or `PixelFormat.TRANSLUCENT`, so the compositor skips blending the layer and can show it through a hardware overlay.
A translucent `SurfaceView` blends against what is below the window, usually black, rather than the React Native views beneath it, which are punched out: this is why a `SurfaceView` is opaque unless asked otherwise.

```tsx twoslash
import {Canvas, Fill} from "react-native-skia";
import type {AndroidBackingView} from "react-native-skia";

// Opaque TextureView: stays in stacking order, e.g. inside a ScrollView
export const InScrollView = () => (
  <Canvas style={{ flex: 1 }} android={{ opaque: true }}>
    <Fill color="cyan" />
  </Canvas>
);

// Full-screen scene on a SurfaceView: no composition pass
export const FullScreen = () => (
  <Canvas style={{ flex: 1 }} android={{ backingView: "SurfaceView" }}>
    <Fill color="cyan" />
  </Canvas>
);

// Translucent SurfaceView above every React Native view
export const Overlay = () => (
  <Canvas
    style={{ flex: 1 }}
    android={{ backingView: "SurfaceView", opaque: false, zOrderOnTop: true }}
  >
    <Fill color="rgba(0, 255, 255, 0.5)" />
  </Canvas>
);

// The backing view is chosen at mount: a canvas that switches it remounts
export const Switchable = ({ backingView }: { backingView: AndroidBackingView }) => (
  <Canvas key={backingView} style={{ flex: 1 }} android={{ backingView }}>
    <Fill color="cyan" />
  </Canvas>
);
```

### Choosing the view at mount

The backing view is created when the canvas mounts, from `backingView` and `highBitDepth` as they are then (and, before Android 11, the z-order options), and kept for as long as the canvas is mounted.
`opaque` applies in place, and so do `zOrderOnTop` and `zOrderMediaOverlay` on Android 11 and later; a change of the other props is ignored, with a warning in development.
A canvas that needs another backing view is remounted instead: give it a `key` that changes with `backingView`.
The remount leaves the canvas off screen for a frame or two, showing what is behind it, or black, until the new view draws its first frame: the old view leaves and the new one arrives in different window frames.
Keeping a canvas on screen through such a swap is possible, but takes hold-and-retire logic specific to each Android release ([#4189](https://github.com/wcandillon/react-native-skia/pull/4189), [#4192](https://github.com/wcandillon/react-native-skia/pull/4192)) that the library does not carry.

:::warning

A translucent `SurfaceView` without `zOrderOnTop` sits below the app window, so its alpha blends against the window background (usually black) and the React Native views beneath it are punched out.
Pair it with `zOrderOnTop` to composite over React Native content, or keep the default `TextureView`.
`zOrderOnTop` draws above all React Native views in the window, including navigation screens, regardless of `zIndex`.

:::

## High bit depth

By default the canvas renders into an 8-bit surface. With only 256 levels per channel, subtle gradients quantize into visible bands, especially in dark tones and on OLED displays.
With `highBitDepth`, the canvas renders into a 16-bit float surface on iOS and a 10-bit surface on Android.
Colors are identical to the default surface, only with more precision: this is about bit depth, not HDR.

```tsx twoslash
import {Canvas, Fill, LinearGradient, vec} from "react-native-skia";

const Demo = () => {
  return (
    <Canvas
      style={{ flex: 1 }}
      highBitDepth
      android={{ backingView: "SurfaceView" }}
    >
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

On Android, `highBitDepth` needs a `SurfaceView` (`android={{ backingView: "SurfaceView" }}`): a `TextureView` composites through an 8-bit pass anyway, so on any other backing view the canvas keeps the 8-bit format, with a warning in development.
The 10-bit format only has 2 bits of alpha, so a `highBitDepth` canvas is opaque, whatever `android.opaque` says.
When the device does not support the 10-bit format, the canvas falls back to 8-bit.
The format is chosen when the canvas mounts: to change it, remount the canvas with a new `key`.

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
