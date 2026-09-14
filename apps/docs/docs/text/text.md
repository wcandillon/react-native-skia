---
id: text
title: Text
sidebar_label: Text
slug: /text/text
---

The text component can be used to draw a simple text.
Please note that the y origin of the Text is the bottom of the text, not the top.

| Name        | Type       |  Description                                                    |
|:------------|:-----------|:----------------------------------------------------------------|
| text        | `string`   | Text to draw                                                    |
| font        | `SkFont`   | Font to use                                                     |
| x           | `number`   | Left position of the text (default is 0)                        |
| y           | `number`   | Bottom position the text (default is 0, the )                   |

### Simple Text

```tsx twoslash
import {Canvas, Text, useFont, Fill} from "@shopify/react-native-skia";

export const HelloWorld = () => {
  const fontSize = 32;
  const font = useFont(require("./my-font.ttf"), fontSize);
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

## Fonts

Once the fonts are loaded, we provide a `matchFont` function that given a font style will return a font object that you can use directly.

:::info

For font matching we recommend using the [Paragraph API](/docs/text/paragraph/) instead.
The APIs belows were made available before the Paragraph API was released.

:::

```tsx twoslash
import {useFonts, Text, matchFont} from "@shopify/react-native-skia";

const Demo = () => {
  const fontMgr = useFonts({
    Roboto: [
      require("./Roboto-Medium.ttf"),
      require("./Roboto-Regular.ttf"),
      require("./Roboto-Bold.ttf"),
    ]
  });
  if (!fontMgr) {
    return null;
  }
  const fontStyle = {
    fontFamily: "Roboto",
    fontWeight: "bold",
    fontSize: 16
  } as const;
  const font = matchFont(fontStyle, fontMgr);
  return (
    <Text text="Hello World" y={32} x={32} font={font} />
  );
};
```

## System Fonts

System fonts are available via `Skia.FontMgr.System()`.
You can list system fonts via  `listFontFamilies` function returns the list of available system font families.
By default the function will list system fonts but you can pass an optional `fontMgr` object as parameter.

```jsx twoslash
import {listFontFamilies} from "@shopify/react-native-skia";

console.log(listFontFamilies());
```

Output example on Android:
```
["sans-serif", "arial", "helvetica", "tahoma", "verdana", ...]
```

or on iOS:
```
["Academy Engraved LET", "Al Nile", "American Typewriter", "Apple Color Emoji", ...]
```

By default matchFont, will match fonts from the system font manager:

```jsx twoslash
import {Platform} from "react-native";
import {Canvas, Text, matchFont, Fill, Skia} from "@shopify/react-native-skia";
 
const fontFamily = Platform.select({ ios: "Helvetica", default: "serif" });
const fontStyle = {
  fontFamily,
  fontSize: 14,
  fontStyle: "italic",
  fontWeight: "bold",
};
const font = matchFont(fontStyle);

export const HelloWorld = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="white" />
      <Text
        x={0}
        y={fontStyle.fontSize}
        text="Hello World"
        font={font}
      />
    </Canvas>
  );
};
```

The `fontStyle` object can have the following list of optional attributes:

- `fontFamily`: The name of the font family.
- `fontSize`: The size of the font.
- `fontStyle`: The slant of the font. Can be `normal`, `italic`, or `oblique`, or a `FontSlant` enum value.
- `fontWeight`: The weight of the font. Can be `normal`, `bold`, or any of `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`, or a `FontWeight` enum value.

The font style type is exported as `RNFontStyle` (with its `fontStyle` and `fontWeight` attributes typed as `RNFontSlant` and `RNFontWeight`), so you can type your own helpers.
`fontWeight` and `fontStyle` also accept the `FontWeight` and `FontSlant` enums used by the [Paragraph API](/docs/text/paragraph/), meaning the same style values can be shared between `matchFont` and a Paragraph `TextStyle` without any conversion:

```tsx twoslash
import {matchFont, FontWeight, FontSlant} from "@shopify/react-native-skia";
import type {RNFontStyle} from "@shopify/react-native-skia";

const labelStyle: Partial<RNFontStyle> = {
  fontFamily: "Roboto",
  fontSize: 16,
  // FontWeight.Medium (500) and FontSlant.Italic are the same values
  // you would use in a Paragraph TextStyle
  fontWeight: FontWeight.Medium,
  fontStyle: FontSlant.Italic,
};
const font = matchFont(labelStyle);
```

By default, `matchFont` uses the system font manager to match the font style. However, if you want to use your custom font manager, you can pass it as the second parameter to the `matchFont` function:

```jsx twoslash
import {matchFont, useFonts} from "@shopify/react-native-skia";

const fontMgr = useFonts({
  Roboto: [
    require("../../Tests/assets/Roboto-Medium.ttf"),
    require("../../Tests/assets/Roboto-Bold.ttf"),
  ]
});

const font = matchFont(fontStyle, fontMgr);
```

## Low-level API

The basic usage of the system font manager is as follows.
These are the APIs used behind the scene by the `matchFont` function.

```tsx twoslash
import {Platform} from "react-native";
import {Skia, FontStyle} from "@shopify/react-native-skia";
 
const familyName = Platform.select({ ios: "Helvetica", default: "serif" });
const fontSize = 32;
// Get the system font manager
const fontMgr = Skia.FontMgr.System();
// The custom font manager is available via Skia.TypefaceFontProvider.Make()
const customFontMgr = Skia.TypefaceFontProvider.Make();
// typeface needs to be loaded via Skia.Data and instanciated via
// Skia.Typeface.MakeFreeTypeFaceFromData()
// customFontMgr.registerTypeface(customTypeFace, "Roboto");

// Matching a font
const typeface =  fontMgr.matchFamilyStyle(familyName, FontStyle.Bold);
const font = Skia.Font(typeface, fontSize);
```
