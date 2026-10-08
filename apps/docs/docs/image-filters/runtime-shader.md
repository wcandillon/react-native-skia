---
id: runtime-shader
title: Runtime Shader
sidebar_label: Runtime Shader
slug: /image-filters/runtime-shader
---

The `RuntimeShader` image filter allows you to write your own [Skia Shader](/docs/shaders/overview) as an image filter.
This component receives the currently filtered image as a shader uniform (or the implicit source image if no children are provided).

:::info

Because RuntimeShader doesn't take into account the pixel density scaling, we recommend applying a technique known as supersampling. [See below](#pixel-density).

:::


| Name      | Type              |  Description                     |
|:----------|:------------------|:---------------------------------|
| source    | `SkRuntimeEffect` | Shader to use as an image filter |
| children? | `ImageFilter`   | Optional image filter to be applied first |


## Example

The example below generates a circle with a green mint color.
The circle is first drawn with the light blue color `#add8e6`, and the runtime shader switches the blue with the green channel: we get mint green `#ade6d8`.

```tsx twoslash
import {Canvas, Text, RuntimeShader, Skia, Group, Circle} from "react-native-skia";

const source = Skia.RuntimeEffect.Make(`
uniform shader image;

half4 main(float2 xy) {
  return image.eval(xy).rbga;
}
`)!;

export const RuntimeShaderDemo = () => {
  const r = 128;
  return (
    <Canvas style={{ flex: 1 }}>
      <Group>
        <RuntimeShader source={source} />
        <Circle cx={r} cy={r} r={r} color="lightblue" />
      </Group>
    </Canvas>
  );
};
```

<img alt="Runtime Shader" src={require("/static/img/image-filters/runtime-shader.png").default} width="256" height="256" />

## Pixel Density

`RuntimeShader` is not taking into account the pixel density scaling ([learn more why](https://issues.skia.org/issues/40044507)).
To keep the image filter output crisp, We upscale the filtered drawing to the [pixel density of the app](https://reactnative.dev/docs/pixelratio). Once the drawing is filtered, we scale it back to the original size. This can be seen in the example below. These operations must be performed on a Skia layer via the `layer` property.

```tsx twoslash
import {Canvas, Text, RuntimeShader, Skia, Group, Circle, Paint, Fill, useFont} from "react-native-skia";
import {PixelRatio} from "react-native";

const pd = PixelRatio.get();
const source = Skia.RuntimeEffect.Make(`
uniform shader image;

half4 main(float2 xy) {
  if (xy.x < 256 * ${pd}/2) {
    return color;
  }
  return image.eval(xy).rbga;
}
`)!;

export const RuntimeShaderDemo = () => {
  const r = 128;
  const font = useFont(require("./SF-Pro.ttf"), 24);
  return (
    <Canvas style={{ flex: 1 }}>
      <Group transform={[{ scale: 1 / pd }]}>
        <Group
          layer={
            <Paint>
              <RuntimeShader source={source} />
            </Paint>
          }
          transform={[{ scale: pd }]}
        >
          <Fill color="#b7c9e2" />
          <Text
            text="Hello World"
            x={16}
            y={32}
            color="#e38ede"
            font={font}
          />
        </Group>
      </Group>
    </Canvas>
  );
};
```

<table style={{ width: '100%' }}>
    <tr>
      <td><b>With supersampling</b></td>
      <td><b>Without supersampling</b></td>
    </tr>
    <tr>
        <td style={{ textAlign: 'left', width: '50%' }}>
          <div style={{ overflow: 'hidden', height: 100 }}>
          <img
            alt="Runtime Shader" 
            src={require("/static/img/runtime-shader/with-supersampling.png").default}
            style={{ width: 512, height: 512 }}
          />
          </div>
        </td>
        <td style={{ textAlign: 'right', width: '50%' }}>
          <div style={{ overflow: 'hidden', height: 100 }}>
          <img
            alt="Runtime Shader"
            src={require("/static/img/runtime-shader/without-supersampling.png").default}
            style={{ width: 512, height: 512 }}
          />
          </div>
        </td>
    </tr>
</table>
