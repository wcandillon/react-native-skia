---
id: colors
title: Blending and Colors
sidebar_label: Blending and Colors
slug: /shaders/colors
---

## Blend Shader

Returns a shader that combines the given shaders with a BlendMode.

| Name        | Type           |  Description                    |
|:------------|:---------------|:--------------------------------|
| mode        | `BlendMode` | see [blend modes](paint/properties.md#blend-mode). |
| children    | `ReactNode` | Shaders to blend |

### Example
```tsx twoslash
import React from "react";
import {
  Canvas,
  Rect,
  Turbulence,
  Skia,
  Shader,
  Fill,
  RadialGradient,
  Blend,
  vec
} from "@shopify/react-native-skia";

export const BlendDemo = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Rect x={0} y={0} width={256} height={256}>
        <Blend mode="difference">
          <RadialGradient
            r={128}
            c={vec(128, 128)}
            colors={["blue", "yellow"]}
          />
          <Turbulence freqX={0.05} freqY={0.05} octaves={4} />
        </Blend>
      </Rect>
    </Canvas>
  );
};
```
### Result
![Blend](assets/blend.png)

## Color Shader

Returns a shader with a given color.

| Name        | Type           |  Description                    |
|:------------|:---------------|:--------------------------------|
| color       | `string`       | Color                           |

### Example
```tsx twoslash
import React from "react";
import {
  Canvas,
  Skia,
  Fill,
  ColorShader
} from "@shopify/react-native-skia";

export const BlendDemo = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill>
        <ColorShader color="lightBlue" />
      </Fill>
    </Canvas>
  );
};
```
### Result
<img src={require("/static/img/shaders/color.png").default} width="256" height="256" />

