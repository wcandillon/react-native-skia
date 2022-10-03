---
id: group
title: Group
sidebar_label: Group
slug: /group
---

The Group component is an essential construct in React Native Skia.
Group components can be deeply nested with one another.
It can apply the following operations to its children:
* [Paint properties](#paint-properties)
* [Transformations](#transformations)
* [Clipping operations](#clipping-operations)
* [Bitmap Effects](#bitmap-effects)

| Name       | Type               |  Description                                                  |
|:-----------|:-------------------|:--------------------------------------------------------------|
| transform? | `Transform2d`      | [Same API than in React Native](https://reactnative.dev/docs/transforms). The default origin of the transformation is, however, different. It is the center object in React Native and the top-left corner in Skia. |
| origin?    | `Point`            | Sets the origin of the transformation. This property is not inherited by its children. |
| clip?   | `RectOrRRectOrPath`     | Rectangle, rounded rectangle, or Path to use to clip the children. |
| invertClip? | `boolean`         | Invert the clipping region: parts outside the clipping region will be shown and, inside will be hidden. |
| layer? | `RefObject<Paint>` | Draws the children as a bitmap and applies the effects provided by the paint. |

## Paint Properties

Its children will inherit all paint attributes applied to a group. These attributes can be properties like `color` or `style` or children like `<Shader />`, or `<ImageFilter />` for instance ([see painting](/docs/paint/overview)).

```tsx twoslash
import {Canvas, Circle, Group} from "@shopify/react-native-skia";
 
export const PaintDemo = () => {
  const r = 128;
  return (
    <Canvas style={{ flex: 1 }}>
      <Circle cx={r} cy={r} r={r} color="#51AFED" />
      {/* The paint is inherited by the following sibling and descendants. */}
      <Group color="lightblue" style="stroke" strokeWidth={10}>
        <Circle cx={r} cy={r} r={r / 2} />
        <Circle cx={r} cy={r} r={r / 3} color="white" />
      </Group>
    </Canvas>
  );
};
```

![Paint Assignment](assets/group/paint-assignment.png)

## Transformations

The transform property is identical to its [homonymous property in React Native](https://reactnative.dev/docs/transforms) except for one significant difference: in React Native, the origin of transformation is the center of the object, whereas it is the top-left position of the object in Skia.

The origin property is a helper to set the origin of the transformation. This property is not inherited by its children.

### Simple Transformation

```tsx twoslash
import {Canvas, Fill, Group, RoundedRect} from "@shopify/react-native-skia";

const SimpleTransform = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="#e8f4f8" />
      <Group color="lightblue" transform={[{ skewX: Math.PI / 6 }]}>
        <RoundedRect x={64} y={64} width={128} height={128} r={10} />
      </Group>
    </Canvas>
  );
};
```

![Simple Transformation](assets/group/simple-transform.png)

### Transformation of Origin

```tsx twoslash
import {Canvas, Fill, Group, RoundedRect} from "@shopify/react-native-skia";

const SimpleTransform = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="#e8f4f8" />
      <Group
        color="lightblue"
        origin={{ x: 128, y: 128 }}
        transform={[{ skewX: Math.PI / 6 }]}
      >
        <RoundedRect x={64} y={64} width={128} height={128} r={10} />
      </Group>
    </Canvas>
  );
};
```

![Origin Transformation](assets/group/origin-transform.png)


## Clipping Operations

`clip` provides a clipping region that sets what part of the children should be shown.
Parts inside the region are shown, while those outside are hidden.
When using `invertClip`, everything outside the clipping region will be shown, and parts inside the clipping region will be hidden.

### Clip Rectangle

```tsx twoslash
import {Canvas, Group, Image, useImage, Skia, rrect, rect, Fill} from "@shopify/react-native-skia";

const size = 256;
const padding = 32;

const Clip = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  const rct = rect(padding, padding, size - padding * 2, size - padding * 2);
  if (!image) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="lightblue" />
      <Group clip={rct}>
        <Image
          image={image}
          x={0}
          y={0}
          width={size}
          height={size}
          fit="cover"
        />
      </Group>
    </Canvas>
  );
};
```

<img src={require("/static/img/group/clip-rect.png").default} width="256" height="256" />

### Clip Rounded Rectangle

```tsx twoslash
import {Canvas, Group, Image, useImage, Skia, rrect, rect} from "@shopify/react-native-skia";

const size = 256;
const padding = 32;
const r = 8;

const Clip = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  const roundedRect = rrect(rect(padding, padding, size - padding * 2, size - padding * 2), r, r);
  if (!image) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Group clip={roundedRect}>
        <Image
          image={image}
          x={0}
          y={0}
          width={size}
          height={size}
          fit="cover"
        />
      </Group>
    </Canvas>
  );
};
```

<img src={require("/static/img/group/clip-rrect.png").default} width="256" height="256" />

### Clip Path

```tsx twoslash
import {Canvas, Group, Image, useImage, Skia} from "@shopify/react-native-skia";

const Clip = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  const star = Skia.Path.MakeFromSVGString(
    "M 128 0 L 168 80 L 256 93 L 192 155 L 207 244 L 128 202 L 49 244 L 64 155 L 0 93 L 88 80 L 128 0 Z"
  )!;
  if (!image) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Group clip={star}>
        <Image
          image={image}
          x={0}
          y={0}
          width={256}
          height={256}
          fit="cover"
        />
      </Group>
    </Canvas>
  );
};
```

<img src={require("/static/img/group/clip-path.png").default} width="256" height="256" />


### Invert Clip

```tsx twoslash
import {Canvas, Group, Image, useImage, Skia} from "@shopify/react-native-skia";

const Clip = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  const star = Skia.Path.MakeFromSVGString(
    "M 128 0 L 168 80 L 256 93 L 192 155 L 207 244 L 128 202 L 49 244 L 64 155 L 0 93 L 88 80 L 128 0 Z"
  )!;
  if (!image) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Group clip={star} invertClip>
        <Image
          image={image}
          x={0}
          y={0}
          width={256}
          height={256}
          fit="cover"
        />
      </Group>
    </Canvas>
  );
};
```

<img src={require("/static/img/group/invert-clip.png").default} width="256" height="256" />

## Layer Effects

Using the `layer` property will create a bitmap drawing of the children.
You can use it to apply effects.
This is particularly useful to build effects that need to be applied to a group of elements and not one in particular.

```tsx twoslash
import {Canvas, Group, Circle, Blur, Paint, ColorMatrix, usePaintRef} from "@shopify/react-native-skia";

const Clip = () => {
  const paint = usePaintRef();
  return (
    <Canvas style={{ flex: 1 }}>
      <Paint ref={paint}>
        <Blur blur={20} />
        <ColorMatrix
          matrix={[
            1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 18, -7,
          ]}
        />
      </Paint>
      <Group color="lightblue" layer={paint}>
        <Circle cx={0} cy={128} r={128 * 0.95} />
        <Circle
          cx={256}
          cy={128}
          r={128 * 0.95}
        />
      </Group>
    </Canvas>
  );
};
```

<img alt="Rasterize" src={require("/static/img/group/rasterize.png").default} width="256" height="256" />


## Fitbox

The `FitBox` component is based on the `Group` component and allows you to scale drawings to fit into a destination rectangle automatically.

| Name | Type     |  Description                                       |
|:-----|:---------|:---------------------------------------------------|
| src  | `SKRect` | Bounding rectangle of the drawing before scaling  |
| dst  | `SKRect` | Bounding rectangle of the drawing after scale      |
| fit? | `Fit`    | Method to make the image fit into the rectangle. Value can be `contain`, `fill`, `cover` `fitHeight`, `fitWidth`, `scaleDown`, `none` (default is `contain`) |

### Example

Consider the following SVG export.
Its bounding source rectangle is `0, 0, 664, 308`:

```xml
<svg width="664" height="308" viewBox="0 0 664 308" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 170.1 215.5 C 165 222.3..." fill="black"/>
</svg>
```

We would like to automatically scale that path to our canvas of size `256 x 256`:

```tsx twoslash
import {Canvas, FitBox, Path, rect} from "@shopify/react-native-skia";

const Hello = () => {
  return (
    <Canvas style={{ width: 256, height: 256 }}>
      <FitBox src={rect(0, 0, 664, 308)} dst={rect(0, 0, 256, 256)}>
        <Path
          path="M 170.1 215.5 C 165 222.3..."
          strokeCap="round"
          strokeJoin="round"
          style="stroke"
          strokeWidth={30}
        />
      </FitBox>
    </Canvas>
  );
}
```

<img src={require("/static/img/group/scale-path.png").default} width="256" height="256" />

