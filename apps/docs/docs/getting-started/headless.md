---
id: headless
title: Headless
sidebar_label: Headless
slug: /getting-started/headless
---

Thanks to its offscreen capabilities, React Native Skia can run on Node.
This means that you can use the Skia API to draw things that can be encoded and saved as images.
By default, drawings will be executed on the CPU but it is possible to also use [GPU Acceleration](#gpu-acceleration).

## Hello World

You will notice in the example below that the import URL looks different than the one used in React Native. There are two reasons for it. First, because Node programs don't rely on module bundlers such as Webpack, you will need to use the commonjs build of React Native Skia. Finally, we want to import the Skia APIs we need on Node without importing the one that rely on pure React Native APIs.

```tsx
import { LoadSkiaWeb } from "react-native-skia/lib/commonjs/web/LoadSkiaWeb";
import { Circle, drawOffscreen, getSkiaExports, Group, makeOffscreenSurface } from "react-native-skia/lib/commonjs/headless";

(async () => {
  const width = 256;
  const height = 256;
  const size = 60;
  const r = size * 0.33;
  await LoadSkiaWeb();
  // Once that CanvasKit is loaded, you can access Skia via getSkiaExports()
  // Alternatively you can do const {Skia} = require("react-native-skia")
  const {Skia} = getSkiaExports();
  using surface = makeOffscreenSurface(width, height);
  using image = await drawOffscreen(surface,
    <Group blendMode="multiply">
      <Circle cx={r} cy={r} r={r} color="cyan" />
      <Circle cx={size - r} cy={r} r={r} color="magenta" />
      <Circle
        cx={size/2}
        cy={size - r}
        r={r}
        color="yellow"
      />
    </Group>);
  console.log(image.encodeToBase64());
})();
```

## GPU Acceleration

React Native Skia relies on the [OffscreenCanvas API](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) to support GPU-Accelerated offscreen surfaces.
This means, that to benefit from the GPU acceleration, you will need to provide a polyfill of the [OffscreenCanvas API](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) on Node.
For example, [here](https://gist.github.com/wcandillon/a46e922910a814139758d6eda9d99ff8) is an OffScreenCanvas polyfill implementation that relies on WebGL using [headless-gl](https://github.com/stackgl/headless-gl).
