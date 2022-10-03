---
id: properties
title: Painting Properties
sidebar_label: Properties
slug: /paint/properties
---

Below are the properties of a Paint component.
The following children can also be assigned to a Paint:
* [Shaders](/docs/shaders/overview) 
* [Image Filters](/docs/image-filters/overview)
* [Color Filters](/docs/color-filters)
* [Mask Filters](/docs/mask-filters)
* [Path Effects](/docs/path-effects)

## color

Sets the alpha and RGB used when stroking and filling.
The color is a string or a number.

```tsx twoslash
import {Paint} from "@shopify/react-native-skia";

<>
  <Paint color="red" />
  {/* 0xffff0000 is also red (format is argb) */}
  <Paint color={0xffff0000} />
</>
```

## opacity

Replaces alpha, leaving RGBA unchanged. 0 means fully transparent, 1.0 means opaque.
When setting opacity in a Group component, the alpha component of all descending colors will inherit that value.

```tsx twoslash
import {Canvas, Circle, Group, Paint, vec} from "@shopify/react-native-skia";

const width = 256;
const height = 256;
const strokeWidth = 30;
const r = width / 2 - strokeWidth / 2;
const c = vec(width / 2, height / 2);

export const OpacityDemo = () => {
  return (
    <Canvas style={{ width, height }}>
      <Group opacity={0.5}>
        <Circle c={c} r={r} color="red" />
        <Circle
          c={c}
          r={r}
          color="lightblue"
          style="stroke"
          strokeWidth={strokeWidth}
        />
        <Circle
          c={c}
          r={r}
          color="mint"
          style="stroke"
          strokeWidth={strokeWidth / 2}
        />
      </Group>
    </Canvas>
  );
};
```

<img alt="Paint Opacity" src={require("/static/img/paint/opacity.png").default} width="256" height="256" />

## blendMode

Sets the blend mode that is, the mode used to combine source color with destination color.
The following values are available: `clear`, `src`, `dst`, `srcOver`, `dstOver`, `srcIn`, `dstIn`, `srcOut`, `dstOut`,
`srcATop`, `dstATop`, `xor`, `plus`, `modulate`, `screen`, `overlay`, `darken`, `lighten`, `colorDodge`, `colorBurn`, `hardLight`,
`softLight`, `difference`, `exclusion`, `multiply`, `hue`, `saturation`, `color`, `luminosity`.

## style

The paint style can be `fill` (default) or `stroke`.

## strokeWidth

Thickness of the pen used to outline the shape.

## strokeJoin

Sets the geometry drawn at the corners of strokes.
Values can be `bevel`, `miter`, or `round`.

## strokeCap

Returns the geometry drawn at the beginning and end of strokes.
Values can be `butt`, `round`, or `square`.

## strokeMiter

Limit at which a sharp corner is drawn beveled.

## antiAlias

Requests, but does not require, that edge pixels draw opaque or with partial transparency.