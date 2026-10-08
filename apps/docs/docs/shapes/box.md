---
id: box
title: Box
sidebar_label: Box
slug: /shapes/box
---

import useBaseUrl from '@docusaurus/useBaseUrl';


In React Native Skia, a box is a rectangle or a rounded rectangle.
Currently it can be used to provide a fast inner shadow primitive.
It may have some other features in the future.

| Name       | Type     |  Description                                       |
|:-----------|:---------|:---------------------------------------------------|
| box        | `SkRect` or `SkRRect` | Rounded rectangle to draw             |
| children?  | `BoxShadow` | Bounding rectangle of the drawing after scale   |

The `Box` component accepts `BoxShadow` components as children.

| Name    | Type      |  Description                                           |
|:--------|:----------|:-------------------------------------------------------|
| dx?     | `number`  | The X offset of the shadow.                            |
| dy?     | `number`  | The Y offset of the shadow.                            |
| blur    | `number`  | The blur radius for the shadow                         |
| color   | `Color`   | The color of the drop shadow                           |
| inner?  | `boolean` | Shadows are drawn within the input content             |
| spread? | `number`  | If true, the result does not include the input content | 


## Example

```tsx twoslash
import {Canvas, Box, BoxShadow, Fill, rrect, rect} from "react-native-skia";

export const Demo = () => (
  <Canvas style={{ width: 256, height: 256 }}>
    <Fill color="#add8e6" />
    <Box box={rrect(rect(64, 64, 128, 128), 24, 24)} color="#add8e6">
      <BoxShadow dx={10} dy={10} blur={10} color="#93b8c4" inner />
      <BoxShadow dx={-10} dy={-10} blur={10} color="#c7f8ff" inner />
      <BoxShadow dx={10} dy={10} blur={10} color="#93b8c4" />
      <BoxShadow dx={-10} dy={-10} blur={10} color="#c7f8ff" />
    </Box>
  </Canvas>
);
```

### Result

<img src={require("/static/img/box/box-shadow.png").default} width="256" height="256" />
