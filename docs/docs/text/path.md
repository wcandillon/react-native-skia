---
id: path
title: Text Path
sidebar_label: Text Path
slug: /text/path
---

Draws text along a path.

| Name        | Type               |  Description                                                 |
|:------------|:-------------------|:-------------------------------------------------------------|
| path        | `Path` or `string` | Path to draw. Can be a string using the [SVG Path notation](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#line_commands) or an object created with `Skia.Path.Make()` |
| text        | `string`           | Text to draw                                                 |
| font        | `SkFont`             | Font to use                                                  |

## Example

```tsx twoslash
import {Canvas, Group, TextPath, Skia, useFont, vec, Fill} from "@shopify/react-native-skia";

const size = 128;
const path = Skia.Path.Make();
path.addCircle(size, size, size/2);

export const HelloWorld = () => {
  const font = useFont(require("./my-font.ttf"), 24);
  if (font === null) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="white" />
      <Group transform={[{ rotate: Math.PI }]} origin={vec(size, size)}>
        <TextPath font={font} path={path} text="Hello World!" />
      </Group>
    </Canvas>
  );
};
```

<img src={require("/static/img/text/text-path.png").default} width="256" height="256" />
