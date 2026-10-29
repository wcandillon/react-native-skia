---
id: image
title: Images
sidebar_label: Image
slug: /images
---

## Loading Images

### useImage

Images are loaded using the `useImage` hook. This hook returns an `SkImage` instance, which can be passed to the `Image` component.

Images can be loaded using require statements or by passing a network URL directly. It is also possible to load images from the app bundle using named images.

```tsx twoslash
import { useImage } from "react-native-skia";
// Loads an image from the JavaScript bundle
const image1 = useImage(require("./assets/oslo"));
// Loads an image from the network
const image2 = useImage("https://picsum.photos/200/300");
// Loads an image that was added to the Android/iOS bundle
const image3 = useImage("Logo");
```

Loading an image is an asynchronous operation, so the `useImage` hook will return null until the image is fully loaded. You can use this behavior to conditionally render the `Image` component, as shown in the [example below](#example).
The image is also decoded before the hook returns it, off the JS thread: the canvas that draws it never decodes on its first frame (see [GPU and CPU images](#gpu-and-cpu-images)).

The hook also provides an optional error handler as a second parameter, called when the image cannot be loaded or decoded (the hook then returns null).
`loadImage(source)` does the same outside of React: it returns a promise that rejects on failure.

### MakeFromEncoded

You can also create image instances manually using `MakeFromEncoded`.

```tsx twoslash
import { Skia } from "react-native-skia";

// A sample base64-encoded pixel
const data = Skia.Data.fromBase64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==");
const image = Skia.Image.MakeFromEncoded(data);
```

### MakeRaster

`MakeRaster` creates a CPU image from pixel data in the given format. The pixels are copied; see [GPU and CPU images](#gpu-and-cpu-images) for what that means when drawing it.

```tsx twoslash
import { Skia, AlphaType, ColorType } from "react-native-skia";

const pixels = new Uint8Array(256 * 256 * 4);
pixels.fill(255);
let i = 0;
for (let x = 0; x < 256; x++) {
  for (let y = 0; y < 256; y++) {
    pixels[i++] = (x * y) % 255;
  }
}
const data = Skia.Data.fromBytes(pixels);
const img = Skia.Image.MakeRaster(
  {
    width: 256,
    height: 256,
    alphaType: AlphaType.Opaque,
    colorType: ColorType.RGBA_8888,
  },
  data,
  256 * 4
);
```

**Note**: The nested for-loops in the code sample above seem to have a mistake in the loop conditions. They should loop up to `256`, not `256 * 4`, as the pixel data array has been initialized with `256 * 256 * 4` elements representing a 256 by 256 image where each pixel is represented by 4 bytes (RGBA).

## GPU and CPU images

An image lives either on the CPU, as pixels in memory, or on the GPU, as a texture. Where it lives decides what is cheap.

The API names follow this split. "Raster" means CPU: `Skia.Surface.MakeRaster()`, `Skia.Image.MakeRaster()`, `image.makeRasterImage()`. "Texture" means GPU: `image.makeTextureImage()`. "GPUTexture" is a WebGPU texture shared with [React Native WebGPU](/docs/webgpu): `Skia.Image.MakeFromGPUTexture()`, `Skia.Surface.MakeFromGPUTexture()`.
A surface follows the same split: `Skia.Surface.MakeRaster()` draws on the CPU and its snapshots are CPU images, `Skia.Surface.MakeOffscreen()` draws on the GPU and its snapshots are GPU images.

| Image | Lives | Drawing it | Reading its pixels |
| :-- | :-- | :-- | :-- |
| `useImage()`, `Skia.Image.MakeRaster()`, `makeRasterImage()` | CPU | Uploaded on the first frame that draws it, then cached | A copy, on a background thread |
| `surface.makeImageSnapshot()`, `surface.asImage()`, `makeTextureImage()`, `Skia.Image.MakeFromGPUTexture()` | GPU | No copy, from any canvas and any thread | Read back from the GPU |
| `Skia.Image.MakeFromEncoded()` | Encoded bytes | Decoded and uploaded on the first frame that draws it, then cached | Decodes, on a background thread |

The textures of the CPU images the canvases draw are kept in one cache, shared by every canvas: 128 MB at most, least recently drawn out first, and a texture not drawn for ten seconds is released. An image drawn by several canvases is uploaded once and held once, whichever canvas draws it first and however many draw it on the same frame. The upload happens on the frame that first draws the image, on the thread rendering that frame: to pay it earlier, upload the image with `makeTextureImage()`.

Moving an image from one side to the other is explicit:

- `image.makeTextureImage()` uploads a CPU image (or decodes and uploads an encoded one) now, on the calling thread, and returns the GPU image. Use it to pay the upload before the first frame, or to hold a texture for longer than the cache would: this is what [`useImageAsTexture`](/docs/animations/textures#useimageastexture) does. Pass `{ mipmapped: true }` to also build the mipmaps for the `MipmapMode` sampling options.
- `image.makeRasterImage()` resolves to a CPU copy of a GPU image (an encoded image is decoded on a background thread, a CPU image resolves to itself).

Reading pixels is asynchronous, as the GPU is: `makeRasterImage()`, `encodeToBytes()`, `encodeToBase64()` and `readPixels()` all return promises, and none of them waits on the calling thread. A GPU image is read back from the GPU, an encoded image is decoded, and the encoding runs on a background thread. There is no synchronous readback.

```tsx twoslash
import { Skia } from "react-native-skia";

const surface = Skia.Surface.MakeOffscreen(256, 256)!;
surface.getCanvas().drawColor(Skia.Color("cyan"));
surface.flush();
// A GPU image: drawing it anywhere costs nothing.
const image = surface.makeImageSnapshot();
// Encoding it reads it back from the GPU and encodes it off the JS thread.
image.encodeToBase64().then((base64) => {
  console.log(base64);
});
```

The promise settles on the runtime that called: the JS thread, or the Reanimated UI runtime inside a worklet. On a worklet runtime of your own (`createWorkletRuntime`, a frame processor), nothing can post back to the runtime, so the call completes before it returns and the promise is already settled.

On the Web, a texture belongs to the canvas that created it: `makeTextureImage()` returns the image as is, and `surface.asImage()` is a snapshot.

## Image Component

Images can be drawn by specifying the output rectangle and how the image should fit into that rectangle.

| Name   | Type      | Description                                                                                                                                                   |
| :----- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| image  | `SkImage` | An instance of the image.                                                                                                                                               |
| x      | `number`  | The left position of the destination image.                                                                                                                       |
| y      | `number`  | The top position of the destination image.                                                                                                                      |
| width  | `number`  | The width of the destination image.                                                                                                                               |
| height | `number`  | The height of the destination image.                                                                                                                              |
| fit?   | `Fit`     | The method used to fit the image into the rectangle. Values can be `contain`, `fill`, `cover`, `fitHeight`, `fitWidth`, `scaleDown`, or `none` (the default is `contain`). |
| sampling? | `Sampling` | The method used to sample the image. see ([sampling options](/docs/images#sampling-options)). |

### Example

```tsx twoslash
import { Canvas, Image, useImage } from "react-native-skia";

const ImageDemo = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  return (
    <Canvas style={{ flex: 1 }}>
      <Image image={image} fit="contain" x={0} y={0} width={256} height={256} />
    </Canvas>
  );
};
```

### Sampling Options

The `sampling` prop allows you to control how the image is sampled when it is drawn.
Use cubic sampling for best quality: you can use the default `sampling={CubicSampling}` (defaults to `{ B: 0, C: 0 }`) or any value you would like: `sampling={{ B: 0, C: 0.5 }}`.

You can also use filter modes (`nearest` or `linear`) and mipmap modes (`none`, `nearest`, or `linear`). The defaults are `linear` filtering and `none` mipmapping.

```tsx twoslash
import { Canvas, Image, useImage, CubicSampling, FilterMode, MipmapMode } from "react-native-skia";

const ImageDemo = () => {
  const image = useImage(require("./assets/oslo.jpg"));
  return (
    <Canvas style={{ flex: 1 }}>
      <Image
        image={image}
        fit="contain"
        x={0}
        y={0}
        width={256}
        height={256}
        sampling={CubicSampling}
      />
      <Image
        image={image}
        fit="contain"
        x={0}
        y={0}
        width={256}
        height={256}
        sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.Nearest }}
      />
    </Canvas>
  );
};
```

### fit="contain"

![fit="contain"](assets/images/contain.png)

### fit="cover"

![fit="cover"](assets/images/cover.png)

### fit="fill"

![fit="fill"](assets/images/fill.png)

### fit="fitHeight"

![fit="fitHeight"](assets/images/fitHeight.png)

### fit="fitWidth"

![fit="fitWidth"](assets/images/fitWidth.png)

### fit="scaleDown"

![fit="scaleDown"](assets/images/scaleDown.png)

### fit="none"

![fit="none"](assets/images/none.png)

## Instance Methods

| Name            | Description                                                           |
| :-------------- | :-------------------------------------------------------------------- |
| `height`        | Returns the possibly scaled height of the image.                      |
| `width`         | Returns the possibly scaled width of the image.                       |
| `getImageInfo`  | Returns the image info for the image.                                 |
| `encodeToBytes` | Resolves to the image pixels encoded as a `Uint8Array`; rejects when the image cannot be read back or encoded. |
| `encodeToBase64`| Resolves to the image pixels encoded as a base64 string; rejects when the image cannot be read back or encoded. |
| `readPixels`    | Resolves to the image pixels as a `Uint8Array` or `Float32Array`, or to null when nothing could be read. On a GPU image, only the requested rectangle is read back. |
| `makeRasterImage` | Resolves to a CPU copy of the image, read back from the GPU or decoded on a background thread. See [GPU and CPU images](#gpu-and-cpu-images). |
| `makeTextureImage` | Uploads the image to the GPU now and returns the GPU image. See [GPU and CPU images](#gpu-and-cpu-images). |
