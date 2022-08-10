---
id: text
title: Text
sidebar_label: Text
slug: /text/text
---

The text component can be used to draw a simple text.
Please note that the y origin of the Text is the bottom of the text, not the top.

| Name        | Type       |  Description                                                  |
|:------------|:-----------|:--------------------------------------------------------------|
| text        | `string`   | Text to draw                                                  |
| font        | `SkFont`   | Font to use                                                   |
| x           | `number`   | Left position of the text (default is 0)                      |
| y           | `number`   | Bottom position the text (default is 0, the )                 |

### Simple Text

```tsx twoslash
import {Canvas, Text, useFont, Fill} from "@shopify/react-native-skia";

export const HelloWorld = () => {
  const fontSize = 32;
  const font = useFont(require("./my-font.ttf"), fontSize);
  if (font === null) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="white" />
      <Text
        x={0}
        y={fontSize}
        text="Hello World"
        font={font}
      />
    </Canvas>
  );
};
```

<img src={require("/static/img/text/hello-world.png").default} width="256" height="256" />


### Emojis

```tsx twoslash
import {Canvas, Text, useFont, Fill} from "@shopify/react-native-skia";

export const HelloWorld = () => {
  const fontSize = 32;
  const font = useFont(require("./NotoColorEmoji.ttf"), fontSize);
  if (font === null) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="white" />
      <Text text="🙋🌎" font={font} y={fontSize} x={0} />
    </Canvas>
  );
};
```

<img src={require("/static/img/text/text-emoji.png").default} width="256" height="256" />
