---
id: displacement-map
title: Displacement Map
sidebar_label: Displacement Map
slug: /image-filters/displacement-map
---

The displacement map image filter is identical to its [SVG counterpart](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDisplacementMap). The pixel values from the child image are used to displace the filtered image spatially.
The formula for the transformation looks like this:

```
P'(x,y) ← P( x + scale * (XC(x,y) - 0.5), y + scale * (YC(x,y) - 0.5))
```

where `P(x,y)` is the child image, and `P'(x,y)` is the destination. `XC(x,y)` and `YC(x,y)` are the component values of the channel designated by `channelX` and `channelY`.

| Name      | Type           |  Description                                                                          |
|:----------|:---------------|:--------------------------------------------------------------------------------------|
| channelX  | `ColorChannel` | Color channel to be used along the X axis. Possible values are `r`, `g`, `b`, or `a` |
| channelY  | `ColorChannel` | Color channel to be used along the Y axis. Possible values are `r`, `g`, `b`, or `a` |
| scale     | `number`       | Displacement scale factor to be used                                                  |
| children? | `ImageFilter`  | Optional image filter to be applied first.                                            | 

## Example

We use a [Perlin Noise](/docs/shaders/perlin-noise) as a displacement map in the example below.

```tsx twoslash
import { Canvas, Image, Turbulence, DisplacementMap, useImage } from "react-native-skia";

const Filter = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  if (!image) {
    return null;
  }
  return (
    <Canvas style={{ width: 256, height: 256 }}>
      <Image
        image={image}
        x={0}
        y={0}
        width={256}
        height={256}
        fit="cover"
      >
        <DisplacementMap channelX="g" channelY="a" scale={20}>
          <Turbulence freqX={0.01} freqY={0.05} octaves={2} seed={2} />
        </DisplacementMap>
      </Image>
    </Canvas>
  );
};
```

<img src={require("/static/img/displacement-map.png").default} width="256" height="256" />
