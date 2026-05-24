import type { NativeCanvas } from "@shopify/react-native-skia";
import { Skia } from "@shopify/react-native-skia";
import * as THREE from "three";

// three's WebGPURenderer expects a DOM-like canvas. Wrap the NativeCanvas in
// a thin object that exposes the properties three reads.
export class ReactNativeCanvas {
  constructor(private canvas: NativeCanvas) {}

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  set width(width: number) {
    this.canvas.width = width;
  }

  set height(height: number) {
    this.canvas.height = height;
  }

  get clientWidth() {
    return this.canvas.clientWidth ?? this.canvas.width;
  }

  get clientHeight() {
    return this.canvas.clientHeight ?? this.canvas.height;
  }

  set clientWidth(width: number) {
    this.canvas.width = width;
  }

  set clientHeight(height: number) {
    this.canvas.height = height;
  }

  addEventListener(_type: string, _listener: EventListener) {}

  removeEventListener(_type: string, _listener: EventListener) {}

  dispatchEvent(_event: Event) {}

  setPointerCapture() {}

  releasePointerCapture() {}
}

export const makeWebGPURenderer = (
  context: GPUCanvasContext,
  { antialias = true }: { antialias?: boolean } = {}
) =>
  new THREE.WebGPURenderer({
    antialias,
    // Share Skia's GPUDevice so textures three allocates can be wrapped by
    // Skia.Image.MakeImageFromTexture without "associated with different
    // device" validation errors. Skia.hasDevice() is the WebGPU/Graphite
    // gate; callers already check it before constructing the renderer.
    device: Skia.getDevice(),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - three expects an HTMLCanvasElement, our wrapper duck-types it
    canvas: new ReactNativeCanvas(context.canvas as unknown as NativeCanvas),
    context,
  });
