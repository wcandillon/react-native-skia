---
id: image-view
title: Image View
sidebar_label: Image View
slug: /canvas/image-view
---

`SkiaImageView` shows an `SkImage` without a canvas of its own.
The image is drawn once, however many views show it, into a bitmap of the platform's that every view of that image draws inside the window's own drawing: there is no surface, swapchain or render loop per view.
On Android a view that shows the image at half its size or less, on the side it shrinks most, draws a smaller level of the bitmap, made once for every view that needs it, so a large image shown small stays smooth; the level follows the view's layout size, so a view scaled down by a transform draws the level of its layout size.
A view mounts and unmounts as a plain view does, with no surface of its own, and clips, fades and transforms like one.

Use it for an image that does not change and is shown many times: an icon, a badge, a thumbnail, a shadow drawn once.
A drawing that animates belongs in a regular [Canvas](/docs/canvas/overview).

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
| image | `SkImage \| null` | The image the view shows, filling its content box, inside its padding and border; `null` shows nothing. |

The view takes every other prop of a React Native `View` but `children`: no platform draws children above the image. As React Native's `Image` does, it clips the image to its rounded corners unless its style sets `overflow`.

On Android the image keeps its colours under force dark (Android's, or a manufacturer's dark mode for apps), as a canvas's drawing does, while the view's background and border darken with the rest of the app, as a canvas's do.

## How the image gets to the screen

The first view that shows an image draws it on the GPU into a buffer of the platform's, without blocking the JS thread: a hardware bitmap on Android 13 and later where the GPU imports one, and an `IOSurface` on iOS and macOS. Otherwise the image is copied once into a regular bitmap: a GPU image read back, a CPU image scaled on the CPU. An encoded image is decoded first.
The view shows nothing until that drawing is done, and on Android a view drawing a smaller level until that level is made, or a larger one while a lost GPU device is replaced; when its image changes, it keeps showing the one it had until the new one arrives. When an image cannot be drawn, its views show nothing until a later drawing of it succeeds, and a view that changes to it shows nothing too, as React Native's `Image` does when a new source fails.
The buffer is kept while any view shows the image and freed once the last one unmounts; a view mounted after that draws the image again.

On the Web, the view is an `<img>` of the image: its pixels are read out once per image and the browser encodes them to PNG asynchronously, at most 4096 × 4096 pixels in area (the largest canvas Safari draws on iOS before 2024's releases), so a larger image is scaled down to fit. The pixels are read on the main thread, so the first view of a photo of many megapixels costs it a long task.
