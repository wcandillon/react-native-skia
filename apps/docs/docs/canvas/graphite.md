---
id: graphite
title: Graphite View
sidebar_label: Graphite View
slug: /canvas/graphite
---

`SkiaGraphiteView` is a canvas that you drive frame by frame from any JavaScript runtime.
A frame is a Graphite recording: you record it on the thread you are on (the JS thread, the Reanimated UI runtime or a dedicated worklet runtime), and the view presents it on the next display frame.
On the web, where Skia runs on WebGL, the same API is emulated: see [Web](#web) below.

## Recording a frame

The view's ref gives access to its recording context once the view is mounted.
The context knows the size of the view in points and produces one recording at a time.

```tsx
import { useEffect, useRef } from "react";
import { Skia, SkiaGraphiteView } from "react-native-skia";
import type { SkiaGraphiteViewRef } from "react-native-skia";

export const Demo = () => {
  const ref = useRef<SkiaGraphiteViewRef>(null);
  useEffect(() => {
    const ctx = ref.current!.getContext();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("cyan"));
    const canvas = ctx.beginRecording();
    // The canvas starts with whatever the view shows: clear it first.
    canvas.clear(Skia.Color("black"));
    canvas.drawCircle(ctx.width / 2, ctx.height / 2, 64, paint);
    ctx.submit(ctx.finishRecording());
  }, []);
  return <SkiaGraphiteView ref={ref} style={{ flex: 1 }} />;
};
```

`beginRecording()` returns a canvas in points that is valid until `finishRecording()`.
`finishRecording()` returns the recording, and `submit()` queues it for the next frame.
A recording is immutable: you can submit the same one again later without recording it again, which is convenient for static content.

## Threading model

Recording happens on the thread that calls `beginRecording()`. Presenting happens on the display link on iOS (`CADisplayLink`, on the main thread), and on a present thread of its own on Android, so that the main thread pays nothing for a frame: on the vsync of that thread's `Choreographer` for a `SurfaceView`, once its window has drawn the previous frame for a `TextureView`.
The context can be captured into a worklet, so a frame loop can run on the Reanimated UI runtime, at the display's rate, without touching the JS thread:

```tsx
import { useEffect, useRef } from "react";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";
import { Skia, SkiaGraphiteView } from "react-native-skia";
import type { SkGraphiteContext, SkiaGraphiteViewRef } from "react-native-skia";

export const Demo = () => {
  const ref = useRef<SkiaGraphiteViewRef>(null);
  const ctx = useSharedValue<SkGraphiteContext | null>(null);
  useEffect(() => {
    ctx.value = ref.current!.getContext();
  }, [ctx]);
  useFrameCallback((frame) => {
    "worklet";
    if (!ctx.value) {
      return;
    }
    const canvas = ctx.value.beginRecording();
    canvas.clear(Skia.Color("black"));
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("cyan"));
    const t = frame.timestamp / 1000;
    canvas.drawCircle(ctx.value.width / 2 + Math.cos(t) * 100, ctx.value.height / 2, 64, paint);
    ctx.value.submit(ctx.value.finishRecording());
  });
  return <SkiaGraphiteView ref={ref} style={{ flex: 1 }} />;
};
```

A few rules follow from this model:

- One recording is open at a time per view. Finish it before starting the next one, on any runtime.
- Recordings are presented in submission order and never dropped. A later frame may sample a texture an earlier frame uploaded, so when the main thread falls behind, the queued frames are replayed in order and only the last one stays visible. This holds for a frame submitted before the native view exists, whether or not you keep the context: the view owns its recording state natively for as long as it is mounted, and `getContext()` hands out a context to it at any time. A recording made for another size than the surface has by the time it is presented (recorded before the view had a surface, or the view was resized since) still shows, at the cost of an extra copy for that frame.
- The producer clears the canvas. A recording draws on top of what the view shows, which also lets you record only the parts that changed.
- GPU-backed images (offscreen surface snapshots, native buffers, video frames, [WebGPU textures](/docs/webgpu)) can be drawn from any runtime. Their content is uploaded when they are created, so create them before the frame that uses them.
- A loop on the Reanimated UI runtime or on a worklet runtime runs at the display's rate. On iOS, React Native's `requestAnimationFrame` on the JS thread runs at 60 Hz, so a view fed from it presents at that rate (see [High refresh rate displays](/docs/canvas/overview#high-refresh-rate-displays)).

## Snapshots

`makeImageSnapshot()` from `SkiaViewApi` replays the current frame into an offscreen surface and returns a GPU image of it, like it does for a `Canvas`.

## Web

The web has no Graphite. `SkiaGraphiteView` keeps the same API there: a recording is an `SkPicture`, and the view replays the queued recordings through the WebGL context the page shares, using the same renderer as `Canvas`.
Frames are presented in submission order and never dropped, right before the browser paints. One difference to keep in mind: the surface starts cleared on every frame, so a recording should draw the whole frame rather than a delta on top of the previous one.
