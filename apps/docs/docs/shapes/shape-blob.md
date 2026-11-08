---
id: shape-blob
title: Shape Blob
sidebar_label: Shape Blob
slug: /shapes/shape-blob
---

A shape blob draws thousands of filled rectangles, rounded rectangles and circles in a single draw call.

Every `drawRect`, `drawRRect` or `drawCircle` is a draw of its own, and each draw has a CPU cost on the GPU backend (clip, paint key, sort key, ordering): a scene of 20,000 small shapes is bound by that cost long before the GPU is busy. `canvas.drawAtlas` does not help on Graphite, where it records one draw per sprite. A shape blob rasterizes each distinct shape once into an atlas image and draws every shape as a textured quad tinted by its color, all in one `drawVertices` call.

Use it for many small shapes of a few distinct sizes: particles, dots of a chart, cells of a grid, confetti. It is fill only: no strokes, shaders, gradients or per-shape transforms.

```tsx
import { Skia } from "react-native-skia";

const blob = Skia.ShapeBlob();
const red = Skia.Color("red");
for (let i = 0; i < 20000; i++) {
  const x = (i % 100) * 4;
  const y = Math.floor(i / 100) * 4;
  if (i % 2 === 0) {
    blob.addRect(Skia.XYWHRect(x, y, 3, 3), red);
  } else {
    blob.addCircle(x + 1.5, y + 1.5, 1.5, red);
  }
}

// One draw call for the 20,000 shapes.
canvas.drawShapes(blob);
```

## API

| Method | Description |
| :----- | :---------- |
| `Skia.ShapeBlob(options?)` | Creates an empty blob. `options.rasterScale` pins the sprite resolution (see below). |
| `blob.addRect(rect, color)` | Adds a filled rectangle and returns its index. Its position is its top-left corner. |
| `blob.addRRect(rrect, color)` | Adds a filled rounded rectangle with uniform radii and returns its index. Its position is the top-left corner of its bounds. |
| `blob.addCircle(cx, cy, r, color)` | Adds a filled circle and returns its index. Its position is its center. |
| `blob.setPosition(index, x, y)` | Moves a shape. Worklet-safe and allocation-free. |
| `blob.setColor(index, color)` | Changes the color of a shape. Worklet-safe and allocation-free. |
| `blob.count` | The number of shapes. |
| `blob.dispose()` | Releases the blob. |
| `canvas.drawShapes(blob, paint?)` | Draws every shape with one `drawVertices` call under the current matrix and clip. |

Indices are given in insertion order, starting at 0.

The optional `paint` of `drawShapes` applies its opacity, blend mode, color filter and image filter to all the shapes. Its color, shader, style, path effect and mask filter are ignored: each shape has its own color.

## Sprite resolution

Each distinct shape (kind, size and radii) is rasterized once, with anti-aliased edges and a transparent margin, at a scale in pixels per local unit. By default the scale follows the canvas the blob is drawn on: the first draw rasterizes the sprites at the device scale of the current matrix (the pixel density times any scale of your own), and later draws rasterize them again only when that scale leaves 0.75 to 1.5 times the scale of the current atlas. A rotation never does, and neither does a translation. Within that range the sprites are scaled by the GPU with linear filtering, which is invisible for small zooms and softens the edges for large ones. Adding a shape of a new size also rasterizes the atlas again, at the next draw.

A sprite is never rasterized larger than 2048 pixels on a side: past it, the whole atlas is rasterized at a lower scale.

A picture recording canvas has no device scale: its matrix is the identity. When you record a blob into a picture, pass the scale the picture will be drawn at:

```tsx
import { PixelRatio } from "react-native";
import { Skia, createPicture } from "react-native-skia";

const blob = Skia.ShapeBlob({ rasterScale: PixelRatio.get() });
// ... add the shapes
const picture = createPicture((canvas) => {
  canvas.drawShapes(blob);
});
```

With `rasterScale` set, the sprites are rasterized once at that scale and never again for a change of scale.

## Animating shapes

`setPosition` and `setColor` patch one shape in place: the blob keeps its shapes on the CPU, and the next `drawShapes` uploads the new vertices once, whatever the number of changes. They are safe to call from a worklet on the UI thread while another thread draws the blob.

```tsx
import { useEffect, useRef } from "react";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";
import { Skia, SkiaGraphiteView } from "react-native-skia";
import type { SkGraphiteContext, SkiaGraphiteViewRef } from "react-native-skia";

const blob = Skia.ShapeBlob();
const color = Skia.Color("cyan");
for (let i = 0; i < 10000; i++) {
  blob.addCircle((i % 100) * 4, Math.floor(i / 100) * 4, 1.5, color);
}

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
    const t = frame.timestamp / 1000;
    // Move the first row of dots.
    for (let i = 0; i < 100; i++) {
      blob.setPosition(i, i * 4, 20 + Math.sin(t + i / 10) * 10);
    }
    const canvas = ctx.value.beginRecording();
    canvas.clear(Skia.Color("black"));
    canvas.drawShapes(blob);
    ctx.value.submit(ctx.value.finishRecording());
  });
  return <SkiaGraphiteView ref={ref} style={{ flex: 1 }} />;
};
```

A picture that recorded a blob keeps the shapes as they were when it was recorded: setters called afterwards change the blob, not the picture. Draw the blob itself, not a picture of it, when its shapes move.

## Web

On the web the blob has the same API and semantics, on CanvasKit's `MakeVertices` and `drawVertices`.
