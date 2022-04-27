---
id: overview
title: Painting
sidebar_label: Overview
slug: /paint/overview
---

Anytime you draw something in Skia, you want to specify what color it is, how it blends with the background, or what style to draw it in.
We call these painting attributes.
And in React Native Skia, these attributes can be specified as properties or as children of a drawing component (`<Rect />`, or `<Circle />` for instance) or a `<Group />`.
There is also a `<Paint />` component which can be assigned directly to a drawing or group via its reference.

The following painting attributes can be assigned as properties:
* [color](properties.md#color)            
* [blendMode](properties.md#blendmode)     
* [style](properties.md#style)             
* [strokeWidth](properties.md#strokewidth) 
* [strokeJoin](properties.md#strokejoin)   
* [strokeCap](properties.md#strokecap)     
* [strokeMiter](properties.md#strokemiter) 
* [opacity](properties.md#opacity)
* [antiAlias](properties.md#antialias)            

The following painting attributes can be assigned as children:
* [Shaders](/docs/shaders/overview) 
* [Image Filters](/docs/image-filters/overview)
* [Color Filters](/docs/color-filters)
* [Mask Filters](/docs/mask-filters)
* [Path Effects](/docs/path-effects)

## Fills and Strokes

In Skia, a paint has a style property to indicate whether it is a fill or a stroke paint.
When drawing something, you can pass Paint components as children to add strokes and fills.
In the example below, the circle has one light blue fill and two stroke paints.

```tsx twoslash
import {Canvas, Circle, Paint} from "@shopify/react-native-skia";

export const PaintDemo = () => {
  const strokeWidth = 10;
  const r = 128 - strokeWidth / 2;
  return (
    <Canvas style={{ flex: 1 }}>
       <Circle cx={r + strokeWidth / 2} cy={r} r={r} color="red">
        <Paint color="lightblue" />
        <Paint color="#adbce6" style="stroke" strokeWidth={strokeWidth} />
        <Paint color="#ade6d8" style="stroke" strokeWidth={strokeWidth / 2} />
      </Circle>
    </Canvas>
  );
};
```

![Paint Fill and strokes](assets/strokes.png)

## Inheritance

Descendants inherit the paint attributes.
In the example below, the first circle will be filled with a light blue color, and the second circle will have a light blue stroke.  

```tsx twoslash
import {Canvas, Circle, Paint, Group} from "@shopify/react-native-skia";

export const PaintDemo = () => {
  const r = 128;
  return (
    <Canvas style={{ flex: 1 }}>
      <Group color="lightblue">
        <Circle cx={r} cy={r} r={r} />
        <Group style="stroke" strokeWidth={10}>
          <Circle cx={3 * r} cy={3 * r} r={r} />
        </Group>
      </Group>
    </Canvas>
  );
};
```

![Paint Inheritance](assets/inheritance.png)

Complex painting attributes like a shader or an image filter can be passed as children to a group or a drawing.

```tsx twoslash
import {Canvas, Circle, Group, LinearGradient, vec} from "@shopify/react-native-skia";

export const PaintDemo = () => {
  const r = 128;
  return (
    <Canvas style={{ flex: 1 }}>
      <Circle cx={r} cy={r} r={r}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(2 * r, 2 * r)}
          colors={["#00ff87", "#60efff"]}
        />
      </Circle>
      <Group>
        <LinearGradient
          start={vec(2 * r, 2 * r)}
          end={vec(4 * r, 4 * r)}
          colors={["#0061ff", "#60efff"]}
        />
        <Circle cx={3 * r} cy={3 * r} r={r} />
      </Group>
    </Canvas>
  );
};
```

<img src={require("/static/img/paint/complex-paint.png").default} width="256" height="256" />


## Manual Paint Assignment

Finally, we can assign a ref to a Paint component for later use.

```tsx twoslash
import {Canvas, Circle, Paint, usePaintRef} from "@shopify/react-native-skia";

export const PaintDemo = () => {
  const paint = usePaintRef();
  return (
    <Canvas style={{ flex: 1 }}>
        <Paint ref={paint} color="lightblue" />
        {/* We can assign the ref to any shape. This will be handy in advanced use-case */}
        <Circle paint={paint} cx={128} cy={128} r={128} />
    </Canvas>
  );
};
```
