---
id: image-view
title: Image View
sidebar_label: Image View
slug: /canvas/image-view
---

`SkiaImageView` shows an `SkImage` without a canvas of its own.
The image is read back once, however many views show it, and every view of that image draws the same platform bitmap inside the window's own drawing: there is no surface, swapchain or render loop per view.
On Android a view that shows the image at half its size or less, on the side it shrinks most, draws a smaller level of the bitmap, made once for every view that needs it, so a large image shown small stays smooth; the level follows the view's layout size, so a view scaled down by a transform draws the level of its layout size.
A view mounts and unmounts at the cost of a plain view, and clips, fades and transforms like one.

Use it for an image that does not change and is shown many times: an icon, a badge, a thumbnail, a shadow drawn once.
A drawing shown once, written as Skia elements, can be a [static canvas](/docs/canvas/overview#static-canvases) instead; a drawing that animates belongs in a regular [Canvas](/docs/canvas/overview).

```tsx
import { useState } from "react";
import { Skia, SkiaImageView } from "react-native-skia";

const makeBadge = () => {
  const surface = Skia.Surface.MakeOffscreen(64, 64)!;
  const paint = Skia.Paint();
  paint.setColor(Skia.Color("#5856D6"));
  surface.getCanvas().drawCircle(32, 32, 32, paint);
  surface.flush();
  return surface.makeImageSnapshot();
};

export const Badges = () => {
  const [badge] = useState(makeBadge);
  return Array.from({ length: 100 }).map((_, i) => (
    <SkiaImageView key={i} image={badge} style={{ width: 32, height: 32 }} />
  ));
};
```

| Name  | Type              | Description                                                        |
| :---- | :---------------- | :----------------------------------------------------------------- |
| image | `SkImage \| null` | The image the view shows, filling its bounds; `null` shows nothing. |

The view takes every other prop of a React Native `View`.

On Android the image keeps its colours under force dark (Android's, or a manufacturer's dark mode for apps), as a canvas's drawing does, while the view's background and border darken with the rest of the app, as a canvas's do.

## How the image gets to the screen

The first view that shows an image reads its pixels back to the CPU, without blocking the JS thread: a GPU image is copied off its texture, a CPU image is copied, and an encoded image is decoded.
The view shows nothing until that copy arrives, and on Android a view drawing a smaller level until that level is made; when its image changes, it keeps showing the one it had until the new one arrives.
The copy is kept while any view shows the image and freed once the last one unmounts; a view mounted after that reads the image back again.

On the Web, the view is an `<img>` of the image: its pixels are read out once per image and the browser encodes them to PNG asynchronously, at most 4096 × 4096 pixels in area (the largest canvas Safari draws on iOS before 2024's releases), so a larger image is scaled down to fit. The pixels are read on the main thread, so the first view of a photo of many megapixels costs it a long task.
