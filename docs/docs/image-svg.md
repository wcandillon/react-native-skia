---
id: image-svg
title: SVG Images
sidebar_label: SVG
slug: /images-svg
---

Draw an SVG (see [SVG Support](#svg-support)).

If the root dimensions are in absolute units, the width/height properties have no effect since the initial viewport is fixed.

| Name      | Type      |  Description                                                  |
|:----------|:----------|:--------------------------------------------------------------|
| svg       | `SVG` | SVG Image. |
| width?    | `number`  | Width of the destination image. This is used to resolve the initial viewport when the root SVG width is specified in relative units. |
| height?   | `number`  | Height of the destination image. This is used to resolve the initial viewport when the root SVG height is specified in relative units.                              |


### Example

```tsx twoslash
import {
  Canvas,
  ImageSVG,
  useSVG
} from "@shopify/react-native-skia";

const ImageSVGDemo = () => {
  // Alternatively, you can pass an SVG URL directly
  // for instance: const svg = useSVG("https://upload.wikimedia.org/wikipedia/commons/f/fd/Ghostscript_Tiger.svg");
  const svg = useSVG(require("../../assets/tiger.svg"));
  return (
    <Canvas style={{ flex: 1 }}>
      { svg && (
        <ImageSVG
          svg={svg}
          x={0}
          y={0}
          width={256}
          height={256}
        />)
      }
    </Canvas>
  );
};
```

You can also use an inlined string as SVG (using `Skia.SVG.MakeFromString`):

```tsx twoslash
import React from "react";
import { Canvas, ImageSVG, Skia } from "@shopify/react-native-skia";

const svg = Skia.SVG.MakeFromString(
  `<svg viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'>
    <circle cx='31' cy='325' r='120px' fill='#c02aaa'/>
  </svg>`
)!;

export const SVG = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <ImageSVG
        svg={svg}
        x={0}
        y={0}
        width={290}
        height={500}
      />
    </Canvas>
  );
};
```

## SVG Support

The [SVG module from Skia](https://github.com/google/skia/tree/main/modules/svg) displays SVGs as images.
Its capabilities and compliance level are pretty strong.
We expect most SVG files to render correctly out of the box, especially if they come from Figma or Illustrator.
However, please be aware of some of the quirks below when using it.
If your SVG doesn't render correctly and you've considered all the items below, please file [an issue](https://github.com/Shopify/react-native-skia/issues/new).

### Using SVGO

Using [SVGO](https://github.com/svg/svgo) to normalize the SVG file helps a lot. You can use it online [here](https://jakearchibald.github.io/svgomg/). For instance, it can normalize CSS style attributes that contain transformations to the proper transform property.

### RGBA Colors

The RGBA color syntax is not supported. Instead, it would help if you used the `fill-opacity` and `stroke-opacity` attributes. Consider the example below.

```xml
<circle
  r="10"
  cx="10"
  cy="10"
  fill="rgba(100, 200, 300, 0.5)"
  stroke="rgba(100, 200, 300, 0.8)"
/>
```

Would need to be rewritten as:

```xml
<circle
  r="10"
  cx="10"
  cy="10"
  fill="rgb(100, 200, 300)"
  fill-opacity="0.5"
  stroke="rgb(100, 200, 300)"
  stroke-opacity="0.8"
/>
```

The `opacity` attribute also applies to both the `fill` and `stroke` attributes.

### Non Supported Elements

Below is the list of non-supported element. Often these SVGs can be rewritten to not use these elements.
  * `<altGlyph>` (deprecated)
  * `<animate>`
  * `<cursor>` (deprecated)
  * `<feComponentTransfer>`
  * `<feConvolveMatrix>`
  * `<feTile>`
  * `<feDropShadow>` 
  * `<font>` (deprecated)
  * `<foreignObject>`
  * `<glyph>` (deprecated)
  * `<script>`
  * `<view>`


### Font Family

When rendering your SVG with Skia, all fonts available in your app are also available to your SVG. However, the way you can set the `font-family` attribute is not flexible.
This is [a known issue](https://github.com/google/skia/blob/main/modules/svg/src/SkSVGText.cpp#L77) in the SVG Skia module. 
The fallback syntax won't work:
```jsx
// Here we assume that if MyFont is not available, it will default to monospace.
// But it won't work. If MyFont is available, this syntax will be accepted.
<text font-family="MyFont, monospace" />
// This is really all that is supported:
<text font-family="MyFont" />
```

The single quote syntax won't work either.
```jsx
// This won't work
<text font-family="'MyFont', monospace" />
// This will work if MyFont is available in the app
<text font-family="MyFont, monospace" />
```

### Inlined SVGs

Some SVGs contain inlined SVGs via the `<image>` or `<feImage>` elements. This is not supported.

## Gradient Templates

The deprecated `xlink:href` attribute is not supported in gradients.
You can use the `href` attribute instead.
However, we found that it doesn't appear to be adequately supported.
We would recommend avoiding using it.

### Fallbacks

Some SVG with issues display nicely in the browser because they are very tolerant of errors. We found that the Skia SVG module is much less forgiving.
