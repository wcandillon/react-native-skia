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

Recording happens on the thread that calls `beginRecording()`, presenting on the main thread, aligned with the display link (`CADisplayLink` on iOS, the `Choreographer` on Android).
The context can be captured into a worklet, so a frame loop can run on the Reanimated UI runtime without touching the JS thread:

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
- Recordings are presented in submission order and never dropped. A later frame may sample a texture an earlier frame uploaded, so when the main thread falls behind, the queued frames are replayed in order and only the last one stays visible. A recording made for another size than the surface has by the time it is presented (recorded before the view had a surface, or the view was resized since) still shows, at the cost of an extra copy for that frame.
- The producer clears the canvas. A recording draws on top of what the view shows, which also lets you record only the parts that changed.
- GPU-backed images (offscreen surface snapshots, native buffers, video frames, [WebGPU textures](/docs/webgpu)) can be drawn from any runtime. Their content is uploaded when they are created, so create them before the frame that uses them.

## Snapshots

`makeImageSnapshot()` and `makeImageSnapshotAsync()` from `SkiaViewApi` replay the current frame into an offscreen surface, like they do for a `Canvas`.

## Web

The web has no Graphite. `SkiaGraphiteView` keeps the same API there: a recording is an `SkPicture`, and the view replays the queued recordings onto its WebGL surface, using the same renderer as `Canvas` (context-loss recovery included, and `__destroyWebGLContextAfterRender` to stay under the browser's limit on live WebGL contexts).
Frames are presented in submission order and never dropped, right before the browser paints. Two differences to keep in mind: the surface starts cleared on every frame, so a recording should draw the whole frame rather than a delta on top of the previous one; and a WebGL texture belongs to the context that created it, so an image snapshot taken from an offscreen surface must go through `makeNonTextureImage()` before another view can draw it.
