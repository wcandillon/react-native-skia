---
id: canvas
title: Canvas
sidebar_label: Overview
slug: /canvas/overview
---

The Canvas component is the root of your Skia drawing.
You can treat it as a regular React Native view and assign a view style.
Behind the scenes, it is using its own React renderer.

| Name | Type     |  Description.    |
|:-----|:---------|:-----------------|
| style?   | `ViewStyle` | View style |
| ref?   | `Ref<SkiaView>` | Reference to the `SkiaView` object |
| mode?   | `default` or `continuous` | By default, the canvas is only updated when the drawing tree or animation values change. With `mode="continuous"`, the canvas will redraw on every frame |
| onTouch?    | `TouchHandler` | Touch handler for the Canvas (see [touch handler](/docs/animations/touch-events#usetouchhandler)) |
| onLayout? | `NativeEvent<LayoutEvent>` | Invoked on mount and on layout changes (see [onLayout](https://reactnative.dev/docs/view#onlayout)) |

## Getting the Canvas size

If the size of the Canvas is unknown, there are two ways to access it:
  * **In React components**, using the [`onLayout`](https://reactnative.dev/docs/view#onlayout) prop like you would on any regular React Native View. 
  * **In Skia animations**, using [`useCanvas()`](/docs/animations/values#canvas).

## Getting a Canvas Snapshot

You can save your drawings as an image, using `makeImageSnapshot`. This method will return an [Image instance](/docs/images#instance-methods). This instance can be used to draw it via the `<Image>` component, or be saved or shared using binary or base64 encoding.

### Example

```tsx twoslash
import {useEffect} from "react";
import {Canvas, Image, useCanvasRef, Circle} from "@shopify/react-native-skia";

export const Demo = () => {
  const ref = useCanvasRef();
  useEffect(() => {
    setTimeout(() => {
      // you can pass an optional rectangle
      // to only save part of the image
      const image = ref.current?.makeImageSnapshot();
      if (image) {
        // you can use image in an <Image> component
        // Or save to file using encodeToBytes -> Uint8Array
        const bytes = image.encodeToBytes();
      }
    }, 1000)
  });
  return (
    <Canvas style={{ flex: 1 }} ref={ref}>
      <Circle r={128} cx={128} cy={128} color="red" />
    </Canvas>
  );
};
```


