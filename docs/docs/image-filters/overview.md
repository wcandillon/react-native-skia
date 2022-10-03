---
id: overview
title: Image Filters
sidebar_label: Overview
slug: /image-filters/overview
---

Image filters are effects that operate on all the color bits of pixels that make up an image.

## Composing Filters

Color Filters and Shaders and also be used as Image filters.
In the example below, we first apply a color matrix to the content and a blur image filter.

```tsx twoslash
import { Canvas, Blur, Image, ColorMatrix, useImage } from "@shopify/react-native-skia";

const ComposeImageFilter = () => {
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
        <Blur blur={2} mode="clamp">
          <ColorMatrix
            matrix={[
              -0.578, 0.99, 0.588, 0, 0, 0.469, 0.535, -0.003, 0, 0, 0.015,
              1.69, -0.703, 0, 0, 0, 0, 0, 1, 0,
            ]}
          />
        </Blur>
      </Image>
    </Canvas>
  );
};
```

<img src={require("/static/img/image-filters/composing.png").default} width="256" height="256" />
