import { useEffect } from "react";
import type { DependencyList } from "react";
import { PixelRatio } from "react-native";
import type * as THREE from "three";
import { importDevice } from "react-native-webgpu";
import type { SkImage, SkSize } from "react-native-skia";
import { Skia } from "react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useSharedValue } from "react-native-reanimated";

import { makeOffscreenTarget } from "./makeOffscreenTarget";
import {
  makeWebGPURenderer,
  disposeWebGPURenderer,
} from "./makeWebGPURenderer";

export interface ThreeScene {
  scene: THREE.Object3D;
  camera: THREE.Camera;
  // Called before each frame is rendered with three's animation loop time (ms).
  update?: (time: number) => void;
  // Called when the scene is torn down (before the renderer is disposed).
  dispose?: () => void;
}

// Builds the scene once the renderer exists. `size` is the drawing buffer size
// in pixels (use it for the camera aspect ratio). Return nothing to skip
// rendering, e.g. while assets are still loading.
export type ThreeSceneFactory = (
  renderer: THREE.WebGPURenderer,
  size: SkSize
) => ThreeScene | undefined;

export interface ThreeSceneOptions {
  antialias?: boolean;
  // Drawing buffer scale relative to `size`; defaults to the device pixel ratio.
  pixelRatio?: number;
}

// Renders a three.js scene into a Skia image.
//
// three draws into an offscreen WebGPU texture allocated on Skia's Graphite
// device; every frame that texture is wrapped (zero-copy) into a fresh SkImage
// published through the returned shared value, so it can be drawn with
// <Image image={image} /> inside a Skia Canvas and composed with anything else
// Skia can draw. Requires a Graphite build: on other builds the image stays
// null and a warning is logged.
//
// `size` is the Skia Canvas size in dp (e.g. from useCanvasSize()); the scene
// is (re)built whenever it or one of `deps` changes.
export const useThreeScene = (
  size: SkSize,
  makeScene: ThreeSceneFactory,
  deps: DependencyList = [],
  { antialias = true, pixelRatio = PixelRatio.get() }: ThreeSceneOptions = {}
): SharedValue<SkImage | null> => {
  const image = useSharedValue<SkImage | null>(null);

  useEffect(() => {
    const width = Math.floor(size.width * pixelRatio);
    const height = Math.floor(size.height * pixelRatio);
    if (width === 0 || height === 0) {
      return;
    }
    let device: GPUDevice;
    try {
      device = importDevice(Skia.getNativeDevice());
    } catch (e) {
      console.warn(
        "useThreeScene needs Skia's Graphite device to share textures with WebGPU",
        e
      );
      return;
    }

    const target = makeOffscreenTarget(device, width, height);
    const renderer = makeWebGPURenderer({ ...target, antialias });
    const result = makeScene(renderer, { width, height });
    if (!result) {
      target.destroy();
      return;
    }
    const { scene, camera, update, dispose } = result;

    let disposed = false;
    const animate = (time: number) => {
      update?.(time);
      renderer.render(scene, camera);
      // Re-wrap the texture into a fresh SkImage: the wrap is free (the
      // SkImage only references the texture) and a new object is what makes
      // the Skia Canvas redraw with this frame's contents.
      const previous = image.value;
      image.value = Skia.Image.MakeImageFromGPUTexture(target.texture);
      previous?.dispose();
    };
    // Initialize the backend up front so the first published frame is a
    // rendered one (render() would otherwise skip the frame while it inits).
    renderer.init().then(() => {
      if (!disposed) {
        renderer.setAnimationLoop(animate);
      }
    });

    return () => {
      disposed = true;
      dispose?.();
      disposeWebGPURenderer(renderer);
      // Drop the image before the texture so nothing samples a destroyed
      // texture; already submitted GPU work keeps it alive until it completes.
      const last = image.value;
      image.value = null;
      last?.dispose();
      target.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, pixelRatio, antialias, image, ...deps]);

  return image;
};
