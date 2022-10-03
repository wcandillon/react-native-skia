---
id: color-filters
title: Color Filters
sidebar_label: Color Filters
slug: /color-filters
---

## Color Matrix

Creates a color filter using the provided color matrix.
A playground to build color matrices is available [here](https://fecolormatrix.com/). 

| Name      | Type          |  Description                               |
|:----------|:--------------|:-------------------------------------------|
| matrix    | `number[]`    | Color Matrix (5x4)                         |
| children? | `ColorFilter` | Optional color filter to be applied first. |

```tsx twoslash
import { Canvas, ColorMatrix, Image, useImage } from "@shopify/react-native-skia";

const MatrixColorFilter = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  if (!image) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Image
          x={0}
          y={0}
          width={256}
          height={256}
          image={image}
          fit="cover"
        >
          <ColorMatrix
            matrix={[
              -0.578, 0.99, 0.588, 0, 0, 0.469, 0.535, -0.003, 0, 0, 0.015,
              1.69, -0.703, 0, 0, 0, 0, 0, 1, 0,
            ]}
          />
      </Image>
    </Canvas>
  );
};
```

<img src={require("/static/img/color-filters/color-matrix.png").default} width="256" height="256" />

## BlendColor

Creates a color filter with the given color and blend mode.

| Name       | Type          |  Description                                      |
|:-----------|:--------------|:--------------------------------------------------|
| color      | `Color`       | Color                                             |
| mode       | `BlendMode`   | see [blend modes](paint/properties.md#blend-mode).|
| children?  | `ColorFilter` | Optional color filter to be applied first.        |

```tsx twoslash
import { Canvas, BlendColor, Group, Circle } from "@shopify/react-native-skia";
 
const MatrixColorFilter = () => {
  const r = 128;
  return (
    <Canvas style={{ flex: 1 }}>
      <Group>
        <BlendColor color="cyan" mode="multiply" />
        <Circle cx={r} cy={r} r={r} color="yellow" />
        <Circle cx={2 * r} cy={r} r={r} color="magenta" />
      </Group>
    </Canvas>
  );
};
```

<img src={require("/static/img/color-filters/color-blend.png").default} width="256" height="256" />

## Lerp

Creates a color filter that is linearly interpolated between two other color filters.

| Name      | Type          |  Description                               |
|:----------|:--------------|:-------------------------------------------|
| t         | `number`      | Value between 0 and 1.                     |
| children  | `ColorFilter` | The two filters to interpolate from.       |

```tsx twoslash
import { Canvas,ColorMatrix, Image, useImage, Lerp } from "@shopify/react-native-skia";

const MatrixColorFilter = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  if (!image) {
    return null;
  }
  const blackAndWhite = [
    0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0,
  ];
  const purple = [
    1, -0.2, 0, 0, 0, 0, 1, 0, -0.1, 0, 0, 1.2, 1, 0.1, 0, 0, 0, 1.7, 1, 0,
  ];
  return (
    <Canvas style={{ flex: 1 }}>
      <Image
          x={0}
          y={0}
          width={256}
          height={256}
          image={image}
          fit="cover"
        >
          <Lerp t={0.5}>
            <ColorMatrix
              matrix={purple}
            />
            <ColorMatrix
              matrix={blackAndWhite}
            />
          </Lerp>
      </Image>
    </Canvas>
  );
};
```

## LinearToSRGBGamma

Creates a color filter that converts between linear colors and sRGB colors.

| Name       | Type          |  Description                                      |
|:-----------|:--------------|:--------------------------------------------------|
| children?  | `ColorFilter` | Optional color filter to be applied first.        |

```tsx twoslash
import { Canvas, BlendColor, Group, Circle, LinearToSRGBGamma } from "@shopify/react-native-skia";
 
const MatrixColorFilter = () => {
  const r = 128;
  return (
    <Canvas style={{ flex: 1 }}>
      <Group>
        <LinearToSRGBGamma>
          <BlendColor color="lightblue" mode="srcIn" />
        </LinearToSRGBGamma>
        <Circle cx={r} cy={r} r={r} />
      </Group>
    </Canvas>
  );
};
```

## SRGBToLinearGamma

Creates a color filter that converts between sRGB colors and linear colors.

| Name       | Type          |  Description                                      |
|:-----------|:--------------|:--------------------------------------------------|
| children?  | `ColorFilter` | Optional color filter to be applied first.        |

```tsx twoslash
import { Canvas, BlendColor, Group, Circle, SRGBToLinearGamma } from "@shopify/react-native-skia";
 
const MatrixColorFilter = () => {
  const r = 128;
  return (
    <Canvas style={{ flex: 1 }}>
      <Group>
        <SRGBToLinearGamma>
          <BlendColor color="lightblue" mode="srcIn" />
        </SRGBToLinearGamma>
        <Circle cx={r} cy={r} r={r} />
      </Group>
    </Canvas>
  );
};
```
