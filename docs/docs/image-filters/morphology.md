---
id: morphology
title: Morphology
sidebar_label: Morphology
slug: /image-filters/morphology
---

The morphology image filter is identical to its [SVG counterpart](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feMorphology).
It is used to erode or dilate the input image.
Its usefulness lies primarily in fattening or thinning effects.

| Name      | Type                 |  Description                                                        |
|:----------|:---------------------|:--------------------------------------------------------------------|
| operator  | `erode` or `dilate`  | whether to erode (i.e., thin) or dilate (fatten). Default is dilate |
| radius    | `number` or `Vector` | Radius of the effect.                                               |
| children? | `ImageFilter`        | Optional image filter to be applied first.                          | 

## Example

```tsx twoslash
import {Canvas, Text, Morphology, useFont} from "@shopify/react-native-skia";

export const MorphologyDemo = () => {
  const font = useFont(require("./SF-Pro.ttf"), 24);
  if (font === null) {
    return null;
  }
  return (
    <Canvas style={{ width: 256, height: 256 }}>
      <Text
        text="Hello World"
        x={32}
        y={32}
        font={font}
      />
      <Text
        text="Hello World"
        x={32}
        y={64}
        font={font}
      >
        <Morphology radius={1} />
      </Text>
      <Text
        text="Hello World"
        x={32}
        y={96}
        font={font}
      >
        <Morphology radius={0.3} operator="erode" />
      </Text>
    </Canvas>
  );
};
```

<img src={require("/static/img/image-filters/morphology.png").default} width="256" height="256" />
