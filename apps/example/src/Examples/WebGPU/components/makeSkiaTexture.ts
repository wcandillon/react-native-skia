import * as THREE from "three";
import type { SkCanvas } from "react-native-skia";
import { Skia } from "react-native-skia";

export interface SkiaTexture {
  texture: THREE.ExternalTexture;
  // Draws into the texture with Skia and flushes; three samples the result
  // from the next render on. Can be called every frame.
  draw: (callback: (canvas: SkCanvas) => void) => void;
  destroy: () => void;
}

// A three.js texture whose content is drawn by Skia, without any copy: the
// GPUTexture is created on Skia's Graphite device (which `device` must be,
// see importDevice(Skia.getNativeDevice())), Skia renders straight into it
// through Skia.Surface.MakeFromGPUTexture, and three wraps the same
// texture in a THREE.ExternalTexture. Requires a Graphite build.
export const makeSkiaTexture = (
  device: GPUDevice,
  width: number,
  height: number
): SkiaTexture => {
  const gpuTexture = device.createTexture({
    size: [width, height],
    // three's canvas format, which Skia also renders to natively
    format: navigator.gpu.getPreferredCanvasFormat(),
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const surface = Skia.Surface.MakeFromGPUTexture(gpuTexture);
  const canvas = surface.getCanvas();

  const texture = new THREE.ExternalTexture(gpuTexture);
  // The pixels are sRGB encoded in a non-sRGB texture format, which three's
  // WebGPU backend does not decode on its own: sample it with
  // texture(t).colorSpaceToWorking(THREE.SRGBColorSpace) in a node material.
  texture.colorSpace = THREE.SRGBColorSpace;

  return {
    texture,
    draw: (callback) => {
      callback(canvas);
      // Submits Skia's work on the shared queue, ahead of three's next render.
      surface.flush();
    },
    destroy: () => {
      texture.dispose();
      // Drop the surface before the texture it draws into.
      surface.dispose();
      gpuTexture.destroy();
    },
  };
};
