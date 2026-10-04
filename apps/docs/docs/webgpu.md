---
id: webgpu
title: WebGPU
sidebar_label: WebGPU
slug: /webgpu
---

React Native Skia renders with Graphite, which runs on [Dawn](https://dawn.googlesource.com/dawn), Google's WebGPU implementation.
React Native Skia does not expose a WebGPU API itself. To use WebGPU in your app, install [React Native WebGPU](https://wcandillon.github.io/react-native-webgpu/) alongside it.

When both packages are installed, they share a single copy of Dawn, and the GPU device Skia renders with becomes a regular WebGPU `GPUDevice`.
Textures created on that device can be used by both libraries without any copy:

- **From WebGPU to Skia:** draw the output of a WebGPU pipeline or of a [three.js](#threejs) scene in a Skia canvas, and compose it with anything Skia can draw.
- **From Skia to WebGPU:** draw text, paths, or any Skia drawing straight into a texture that a WebGPU pipeline samples.

:::info

The APIs on this page are only available on native platforms. On the Web, Skia runs on WebGL through CanvasKit.

:::

## Installation

```sh
yarn add react-native-webgpu
```

Follow the [installation instructions](https://wcandillon.github.io/react-native-webgpu/docs/getting-started/installation) of React Native WebGPU for the rest of the setup.

Both packages must link the exact same Dawn build so that only one copy of Dawn exists in the app.
The native build verifies this and fails with a `Dawn version mismatch` error if the two packages were built against different Dawn releases.
If you see that error, upgrade `react-native-skia` and `react-native-webgpu` together.

## Sharing the device

`Skia.getNativeDevice()` returns a pointer to the device Skia renders with.
`importDevice()` from React Native WebGPU wraps it into a `GPUDevice`:

```tsx
import { Skia } from "react-native-skia";
import { importDevice } from "react-native-webgpu";

const device = importDevice(Skia.getNativeDevice());
```

Everything you create with this device (textures, buffers, pipelines) lives on the same device as Skia's own resources, which is what makes sharing textures possible.
A few things to know about it:

- The device is owned by Skia and is valid for the lifetime of the process.
- Skia treats the loss of its device as fatal: there is no point in requesting a replacement when it is lost.
- `navigator.gpu.requestAdapter()` and `requestDevice()` still work as usual. Use a device of your own when you want your GPU work isolated from Skia's command queue, but keep in mind that a texture created on another device cannot be shared with Skia.

The shared device works like any other device, for instance to configure a WebGPU canvas:

```tsx
import { Skia } from "react-native-skia";
import type { CanvasRef } from "react-native-webgpu";
import { importDevice } from "react-native-webgpu";

const configure = (canvas: CanvasRef) => {
  const device = importDevice(Skia.getNativeDevice());
  const context = canvas.getContext("webgpu")!;
  context.configure({
    device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "opaque",
  });
  return { device, context };
};
```

The interop surface is small:

| API | Direction | Description |
|:--|:--|:--|
| `Skia.getNativeDevice()` | | Pointer to Skia's device, for `importDevice()` |
| `Skia.Image.MakeImageFromNativeTexture(pointer)` | WebGPU to Skia | Wraps a `GPUTexture` into an `SkImage`, without copy |
| `Skia.Surface.MakeFromNativeTexture(pointer)` | Skia to WebGPU | Creates an `SkSurface` that draws into a `GPUTexture`, without copy |
| `Skia.Image.MakeNativeTextureFromImage(image)` | Skia to WebGPU | Draws an `SkImage` into a new texture, for `adoptTexture()` |

Textures cross the package boundary as pointers: `texture.nativePointer` is an extension of `GPUTexture` provided by React Native WebGPU.

## From WebGPU to Skia

`Skia.Image.MakeImageFromNativeTexture()` wraps a WebGPU texture into an `SkImage`.
The image references the texture, so wrapping it is free.
The texture must be created on the shared device with the `TEXTURE_BINDING` usage.

In the example below, a WebGPU pipeline renders a triangle into a texture, and a Skia canvas draws that texture.

```tsx
import React, { useEffect } from "react";
import { PixelRatio } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import type { SkImage } from "react-native-skia";
import { Canvas, Image, Skia, useCanvasSize } from "react-native-skia";
import { importDevice } from "react-native-webgpu";

const shader = /* wgsl */ `
@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f( 0.0,  0.5),
    vec2f(-0.5, -0.5),
    vec2f( 0.5, -0.5)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(1.0, 0.5, 0.2, 1.0);
}
`;

export const TriangleInSkia = () => {
  const { ref, size } = useCanvasSize();
  const image = useSharedValue<SkImage | null>(null);

  useEffect(() => {
    const width = Math.floor(size.width * PixelRatio.get());
    const height = Math.floor(size.height * PixelRatio.get());
    if (width === 0 || height === 0) {
      return;
    }
    // 1. A GPUDevice backed by Skia's device
    const device = importDevice(Skia.getNativeDevice());

    // 2. A texture on that device: WebGPU renders to it, Skia samples it
    const format = navigator.gpu.getPreferredCanvasFormat();
    const texture = device.createTexture({
      size: [width, height],
      format,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    // 3. Render with WebGPU
    const module = device.createShaderModule({ code: shader });
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs_main" },
      fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: texture.createView(),
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);

    // 4. Wrap the texture into an SkImage, without any copy
    image.value = Skia.Image.MakeImageFromNativeTexture(texture.nativePointer);

    return () => {
      // Drop the image before the texture it samples
      const last = image.value;
      image.value = null;
      last?.dispose();
      texture.destroy();
    };
  }, [size.width, size.height, image]);

  return (
    <Canvas ref={ref} style={{ flex: 1 }}>
      <Image
        image={image}
        x={0}
        y={0}
        width={size.width}
        height={size.height}
        fit="fill"
      />
    </Canvas>
  );
};
```

The result is a regular Skia image: you can use it in an `Image`, an `ImageShader`, or as the input of an image filter.

To animate, render to the same texture on every frame and assign a new `SkImage` to the shared value.
The new object is what makes the canvas redraw:

```tsx
const render = () => {
  // ...encode and submit the WebGPU commands for this frame
  const previous = image.value;
  image.value = Skia.Image.MakeImageFromNativeTexture(texture.nativePointer);
  previous?.dispose();
  frame = requestAnimationFrame(render);
};
```

## From Skia to WebGPU

### Drawing into a texture

`Skia.Surface.MakeFromNativeTexture()` creates a surface that draws directly into a WebGPU texture.
Create the texture on the shared device with the `RENDER_ATTACHMENT` usage, and add `TEXTURE_BINDING` to sample the result from WebGPU.

```tsx
import { Skia } from "react-native-skia";
import { importDevice } from "react-native-webgpu";

const width = 1024;
const height = 1024;
const device = importDevice(Skia.getNativeDevice());
const texture = device.createTexture({
  size: [width, height],
  format: navigator.gpu.getPreferredCanvasFormat(),
  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
});

// Wrap the texture once
const surface = Skia.Surface.MakeFromNativeTexture(texture.nativePointer);
const canvas = surface.getCanvas();
const paint = Skia.Paint();
paint.setColor(Skia.Color("cyan"));

// Draw as often as needed, for instance on every frame
const draw = () => {
  canvas.clear(Skia.Color("black"));
  canvas.drawCircle(width / 2, height / 2, 100, paint);
  // Submits Skia's commands on the shared queue,
  // ahead of the WebGPU commands that will sample the texture
  surface.flush();
};
```

Call `surface.flush()` after drawing and before the WebGPU pass that samples the texture.
When you are done, dispose the surface before destroying the texture:

```tsx
surface.dispose();
texture.destroy();
```

### Exporting an image

`Skia.Image.MakeNativeTextureFromImage()` turns any `SkImage` into a WebGPU texture.
It creates a new texture on the shared device and draws the image into it once.
The returned pointer must be adopted exactly once with `adoptTexture()`, which owns the texture from then on.

```tsx
import type { SkImage } from "react-native-skia";
import { Skia } from "react-native-skia";
import { adoptTexture } from "react-native-webgpu";

const toTexture = (image: SkImage): GPUTexture =>
  adoptTexture(Skia.Image.MakeNativeTextureFromImage(image));
```

## Three.js

[Three.js](https://threejs.org/) runs on React Native WebGPU through its `WebGPURenderer`.
The [three.js guide](https://wcandillon.github.io/react-native-webgpu/docs/integrations/three-js) of React Native WebGPU covers the project setup (Metro, Babel, polyfills, and asset loading).

Pass the shared device to the renderer, and three.js and Skia can exchange textures in both directions:

```tsx
import * as THREE from "three/webgpu";
import { Skia } from "react-native-skia";
import { importDevice } from "react-native-webgpu";

const makeRenderer = (context: GPUCanvasContext) =>
  new THREE.WebGPURenderer({
    antialias: true,
    canvas: context.canvas,
    context,
    // three.js renders on Skia's device instead of requesting its own
    device: importDevice(Skia.getNativeDevice()),
  });
```

### A Skia drawing as a three.js texture

Wrap the texture Skia draws into (see [drawing into a texture](#drawing-into-a-texture)) in a `THREE.ExternalTexture`:

```tsx
import * as THREE from "three/webgpu";
import { texture as textureNode } from "three/tsl";

const makeSkiaMaterial = (gpuTexture: GPUTexture) => {
  const map = new THREE.ExternalTexture(gpuTexture);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicNodeMaterial();
  // The pixels are sRGB encoded in a non-sRGB texture format,
  // which three.js does not decode on its own: decode in the shader.
  // (@types/three declares ColorSpaceNode without its vec4 value type)
  material.colorNode = textureNode(map).colorSpaceToWorking(
    THREE.SRGBColorSpace
  ) as unknown as THREE.Node<"vec4">;
  return material;
};
```

On every frame, draw with Skia, flush the surface, then render the scene:

```tsx
renderer.setAnimationLoop(() => {
  draw(); // draws with Skia and calls surface.flush()
  renderer.render(scene, camera);
  context.present();
});
```

In the example app, the [cloth simulation](https://github.com/wcandillon/react-native-skia/blob/main/apps/example/src/Examples/WebGPU/Cloth.tsx) runs in compute shaders, and the cloth is textured with a Skia drawing that is redrawn on every frame.

### A three.js scene in a Skia canvas

Three.js can also render offscreen, into a texture that a Skia canvas draws.
The renderer expects a canvas context, so we give it a minimal stand-in whose `getCurrentTexture()` always returns the same texture, created on the shared device:

```tsx
export const makeOffscreenTarget = (
  device: GPUDevice,
  width: number,
  height: number
) => {
  // three.js renders to the preferred canvas format when no render target is set
  const format = navigator.gpu.getPreferredCanvasFormat();
  const usage =
    GPUTextureUsage.RENDER_ATTACHMENT |
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_SRC;
  const texture = device.createTexture({ size: [width, height], format, usage });
  // three.js reads the drawing buffer size from the canvas
  const canvas = { width, height } as unknown as HTMLCanvasElement;
  const context: GPUCanvasContext = {
    __brand: "GPUCanvasContext",
    canvas,
    // The texture is allocated up front on the shared device
    configure: () => undefined,
    unconfigure: () => undefined,
    getConfiguration: () => ({
      device,
      format,
      usage,
      viewFormats: [],
      colorSpace: "srgb",
      toneMapping: { mode: "standard" },
      alphaMode: "opaque",
    }),
    getCurrentTexture: () => texture,
  };
  return { device, context, texture };
};
```

After each render, wrap the texture into a new `SkImage` and publish it through a shared value:

```tsx
const device = importDevice(Skia.getNativeDevice());
const target = makeOffscreenTarget(device, width, height);
const renderer = new THREE.WebGPURenderer({
  antialias: true,
  canvas: target.context.canvas,
  context: target.context,
  device,
});
// Initialize the backend up front so that the first published frame is a rendered one
await renderer.init();
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  const previous = image.value;
  image.value = Skia.Image.MakeImageFromNativeTexture(
    target.texture.nativePointer
  );
  previous?.dispose();
});
```

The shared value is then drawn like any other image:

```tsx
<Canvas ref={ref} style={{ flex: 1 }}>
  <Image
    image={image}
    x={0}
    y={0}
    width={size.width}
    height={size.height}
    fit="fill"
  />
</Canvas>
```

The example app packages this recipe into a [`useThreeScene`](https://github.com/wcandillon/react-native-skia/blob/main/apps/example/src/Examples/WebGPU/components/useThreeScene.ts) hook, used to render a [glTF model](https://github.com/wcandillon/react-native-skia/blob/main/apps/example/src/Examples/WebGPU/Helmet.tsx) inside a Skia canvas.

## Lifetime rules

Sharing a texture means sharing its lifetime. A few rules apply:

- **Use the shared device.** Only textures created on `importDevice(Skia.getNativeDevice())` can be shared.
- **Dispose Skia objects before destroying the texture.** An `SkImage` or `SkSurface` wrapping a texture holds its own reference to it, so the texture stays valid even if the JavaScript `GPUTexture` is garbage collected. Calling `texture.destroy()` releases the GPU resource regardless of references: dispose the image or surface first.
- **Flush before sampling.** After drawing into a texture with Skia, call `surface.flush()` before the WebGPU commands that sample it.
- **Adopt exported textures exactly once.** The pointer returned by `MakeNativeTextureFromImage()` carries one reference, which `adoptTexture()` takes over.

## Examples

The [example app](https://github.com/wcandillon/react-native-skia/tree/main/apps/example/src/Examples/WebGPU) contains the complete examples.
The React Native WebGPU documentation also has a page on [React Native Skia](https://wcandillon.github.io/react-native-webgpu/docs/integrations/react-native-skia), which covers version compatibility between the two packages.


| Example | Description |
|:--|:--|
| [Triangle](https://github.com/wcandillon/react-native-skia/blob/main/apps/example/src/Examples/WebGPU/Triangle.tsx) | A WebGPU canvas rendering on Skia's device |
| [Cube](https://github.com/wcandillon/react-native-skia/blob/main/apps/example/src/Examples/WebGPU/Cube.tsx) | Three.js on a WebGPU canvas |
| [Helmet](https://github.com/wcandillon/react-native-skia/blob/main/apps/example/src/Examples/WebGPU/Helmet.tsx) | A three.js scene drawn in a Skia canvas |
| [Cloth](https://github.com/wcandillon/react-native-skia/blob/main/apps/example/src/Examples/WebGPU/Cloth.tsx) | A Skia drawing used as a three.js texture |
