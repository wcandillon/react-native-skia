---
id: atlas
title: Atlas
sidebar_label: Atlas
slug: /shapes/atlas
---

The Atlas component is used for efficient rendering of multiple instances of the same texture or image. It is especially useful for drawing a very large number of similar objects, like sprites or tiles, with varying transformations.

Atlas transforms can be animated with near-zero cost using worklets. This makes it ideal for tile-based maps, sprite animations, and any scenario where you have many instances of similar textures. Its design is particularly useful when combined with [Reanimated](#animations).

| Name    | Type             |  Description     |
|:--------|:-----------------|:-----------------|
| image   | `SkImage or null` | Atlas: image containing the sprites. |
| sprites | `SkRect[]` | locations of sprites in atlas.             |
| transforms | `RSXform[]` | Rotation/scale transforms to be applied for each sprite. |
| colors? | `SkColor[]` | Optional. Color to blend the sprites with. |
| colorBlendMode? | `BlendMode` | Optional. Blend mode used to combine sprite colors with the texture. Default is `dstOver`. |
| blendMode? | `BlendMode` | Optional. Blend mode used for layer compositing (how the Atlas is drawn onto the canvas). |
| sampling? | `Sampling` | The method used to sample the image. see ([sampling options](/docs/images#sampling-options)). |

:::tip

To draw many filled rectangles, rounded rectangles or circles in one draw call, see [Shape Blob](/docs/shapes/shape-blob).

:::

## RSXform

The RSXform object used by the altas API is the compression of the following matrix: `[fSCos -fSSin fTx, fSSin fSCos fTy, 0, 0, 1]`. Below are few transformations that you will find useful:

```tsx twoslash
import {Skia} from "react-native-skia";

// 1. Identity (doesn't do anything)
let rsxForm = Skia.RSXform(1, 0, 0, 0);

// 2. Scale by 2 and translate by (50, 100)
rsxForm = Skia.RSXform(2, 0, 50, 100);

// 3. Rotate by PI/4, default pivot point is (0,0), translate by (50, 100)
const r = Math.PI/4;
rsxForm = Skia.RSXform(Math.cos(r), Math.sin(r), 50, 100);

// 4. Scale by 2, rotate by PI/4 with pivot point (25, 25)
rsxForm = Skia.RSXformFromRadians(2, r, 0, 0, 25, 25);

// 5. translate by (125, 0), rotate by PI/4 with pivot point (125, 25)
rsxForm = Skia.RSXformFromRadians(1, r, 100, 0, 125, 25);
```

## Hello World

In the example below, we draw in simple rectangle as an image.
Then we display that rectangle 150 times with a simple transformation applied to each rectangle.

```tsx
import {Skia, drawAsImage, Group, Rect, Canvas, Atlas, rect} from "react-native-skia";

const size = { width: 25, height: 11.25 };
const strokeWidth = 2;
const imageSize = {
    width: size.width + strokeWidth,
    height: size.height + strokeWidth,
};
const image = await drawAsImage(
    <Group>
    <Rect
        rect={rect(strokeWidth / 2, strokeWidth / 2, size.width, size.height)}
        color="cyan"
    />
    <Rect
        rect={rect(strokeWidth / 2, strokeWidth / 2, size.width, size.height)}
        color="blue"
        style="stroke"
        strokeWidth={strokeWidth}
    />
    </Group>,
    imageSize
);

export const Demo = () => {
  const numberOfBoxes = 150;
  const pos = { x: 128, y: 128 };
  const width = 256;
  const sprites = new Array(numberOfBoxes)
    .fill(0)
    .map(() => rect(0, 0, imageSize.width, imageSize.height));
  const transforms = new Array(numberOfBoxes).fill(0).map((_, i) => {
    const tx = 5 + ((i * size.width) % width);
    const ty = 25 + Math.floor(i / (width / size.width)) * size.width;
    const r = Math.atan2(pos.y - ty, pos.x - tx);
    return Skia.RSXform(Math.cos(r), Math.sin(r), tx, ty);
  });

  return (
    <Canvas style={{ flex: 1 }}>
      <Atlas image={image} sprites={sprites} transforms={transforms} />
    </Canvas>
  );
};
```

<img src={require("/static/img/atlas/hello-world.png").default} width="256" height="256" />


## Animations

The Atlas component should usually be used with Reanimated.
First, the [useTexture](/docs/animations/textures#usetexture) hook will enable you to create a texture off the JS thread without needing to make any copies.
Secondly, we provide you with hooks such as [`useRectBuffer`](/docs/animations/hooks#userectbuffer) and [`useRSXformBuffer`](/docs/animations/hooks#usersxformbuffer) to efficiently animates on the sprites and transformations.

The example below is identical to the one above but the position is an animation value bound to a gesture.


```tsx twoslash
import {Skia, drawAsImage, Group, Rect, Canvas, Atlas, rect, useTexture, useRSXformBuffer} from "react-native-skia";
import {useSharedValue, useDerivedValue} from "react-native-reanimated";
import {GestureDetector, Gesture} from "react-native-gesture-handler";

const size = { width: 25, height: 11.25 };
const strokeWidth = 2;
const textureSize = {
    width: size.width + strokeWidth,
    height: size.height + strokeWidth,
};

export const Demo = () => {
  const pos = useSharedValue({ x: 0, y: 0 });
  const texture = useTexture(
    <Group>
      <Rect
        rect={rect(strokeWidth / 2, strokeWidth / 2, size.width, size.height)}
        color="cyan"
      />
      <Rect
        rect={rect(strokeWidth / 2, strokeWidth / 2, size.width, size.height)}
        color="blue"
        style="stroke"
        strokeWidth={strokeWidth}
      />
    </Group>,
    textureSize
  );
  const gesture = Gesture.Pan().onChange((e) => (pos.value = e));
  const numberOfBoxes = 150;
  const width = 256;
  const sprites = new Array(numberOfBoxes)
    .fill(0)
    .map(() => rect(0, 0, textureSize.width, textureSize.height));

  const transforms = useRSXformBuffer(numberOfBoxes, (val, i) => {
    "worklet";
    const tx = 5 + ((i * size.width) % width);
    const ty = 25 + Math.floor(i / (width / size.width)) * size.width;
    const r = Math.atan2(pos.value.y - ty, pos.value.x - tx);
    val.set(Math.cos(r), Math.sin(r), tx, ty);
  });

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ flex: 1 }}>
        <Atlas image={texture} sprites={sprites} transforms={transforms} />
      </Canvas>
    </GestureDetector>
  );
};
```

## Performance

In v2, Skia drew the whole atlas as a single GPU operation: the Ganesh backend packed every sprite into one vertex buffer and submitted it as one draw (`DrawAtlasOp`).

In v3, React Native Skia renders with [Graphite](/docs/getting-started/migration), and Graphite does not have a dedicated atlas renderer yet.
Its own `drawAtlas`, added in Skia m152 (before that, Graphite drew nothing for an atlas), records one rectangle draw per sprite.
The recording cost grows with the number of sprites on every platform, and when `colors` are given, Android pays a separate draw call per distinct color on backends without storage buffers.
React Native Skia does not use it. The `Atlas` component and `canvas.drawAtlas()` turn the sprites into a single `drawVertices` call, the generic path Skia uses for devices without an atlas renderer (`SkDevice::drawAtlas`), so the whole atlas is one draw on every platform, as in v2.

What this means for you:

- Animating the transforms with [`useRSXformBuffer`](/docs/animations/hooks#usersxformbuffer) remains cheap on the JS and UI threads: the buffers are updated in place and nothing is re-recorded there.
- Each frame, the render thread writes six vertices per sprite (position, texture coordinates and, when `colors` are given, the sprite's color) before the single draw.

### Drawing sprites with WebGPU

If you need more control over how the sprites are drawn, [React Native WebGPU](/docs/webgpu) is an alternative.
Because Skia and WebGPU share the same GPU device in v3, you can draw the sprites with an instanced WebGPU render pipeline and compose the result in a Skia canvas without any copy:

1. Export the atlas image as a WebGPU texture with `Skia.Image.MakeGPUTextureFromImage()` (see [exporting an image](/docs/webgpu#exporting-an-image)).
2. Store the per-sprite data (transform, source rectangle, color) in a vertex buffer with a per-instance step mode and draw all sprites with a single `drawIndexed(6, spriteCount)` call, sampling the atlas texture in the fragment shader.
3. Render into a texture created with the `TEXTURE_BINDING` usage, wrap it with `Skia.Image.MakeFromGPUTexture()`, and draw it with the [`Image`](/docs/images) component (see [from WebGPU to Skia](/docs/webgpu#from-webgpu-to-skia)).

This is what Ganesh did internally in v2, and it scales to a very large number of sprites.
It is only available on native platforms; on the Web, Skia runs on WebGL through CanvasKit, where `drawAtlas` is batched as it was in v2.
