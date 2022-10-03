---
id: offset
title: Offset
sidebar_label: Offset
slug: /image-filters/offset
---

This offset filter is identical to its [SVG counterpart](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feOffset). It allows offsetting the filtered image. 

| Name      | Type           |  Description                               |
|:----------|:---------------|:-------------------------------------------|
| x         | `number`       | Offset along the X axis.                   |
| y         | `number`       | Offset along the Y axis.                   |
| children? | `ImageFilter`  | Optional image filter to be applied first. | 

## Example

```tsx twoslash
import { Canvas, Image, Offset, useImage, Fill } from "@shopify/react-native-skia";

const Filter = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  if (!image) {
    return null;
  }
  return (
    <Canvas style={{ width: 256, height: 256 }}>
      <Fill color="lightblue" />
      <Image
        image={image}
        x={0}
        y={0}
        width={256}
        height={256}
        fit="cover"
      >
        <Offset x={64} y={64} />
      </Image>
    </Canvas>
  );
};
```

<img src={require("/static/img/image-filters/offset.png").default} width="256" height="256" />
