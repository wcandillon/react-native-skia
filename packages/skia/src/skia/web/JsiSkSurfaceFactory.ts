import type { CanvasKit } from "canvaskit-wasm";

import type { GPUTextureHandle, SkSurface, SurfaceFactory } from "../types";
import { SkiaOutOfMemoryError, SkiaValidationError } from "../types/Errors";

import { Host, throwNotImplementedOnRNWeb } from "./Host";
import { JsiSkSurface } from "./JsiSkSurface";
import { getSharedWebGLContext } from "./SharedWebGLContext";

// Throws a SkiaValidationError for a size no surface can have.
const validateSize = (method: string, width: number, height: number) => {
  if (!(width >= 1 && height >= 1)) {
    throw new SkiaValidationError(
      `${method}: the size must be at least 1x1, got ${width}x${height}`
    );
  }
};

export class JsiSkSurfaceFactory extends Host implements SurfaceFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeRaster(width: number, height: number) {
    validateSize("MakeRaster", width, height);
    const surface = this.CanvasKit.MakeSurface(width, height);
    if (!surface) {
      throw new SkiaOutOfMemoryError(
        `MakeRaster: no memory for a ${width}x${height} surface`
      );
    }
    return new JsiSkSurface(this.CanvasKit, surface);
  }

  // A render target on the WebGL context the page shares with its views
  // (see SharedWebGLContext): no context of its own, and a snapshot of it
  // can be drawn by any view.
  MakeOffscreen(width: number, height: number) {
    validateSize("MakeOffscreen", width, height);
    const shared = getSharedWebGLContext(this.CanvasKit);
    if (!shared) {
      // No canvas to be had (Node): draw on the CPU.
      return this.MakeRaster(width, height);
    }
    const grContext = shared.getGrContext();
    if (!grContext) {
      // The context is lost: nothing can be built on it until the browser
      // restores it. Like the objects of a lost GPU device on native, the
      // surface is made all the same, on the CPU.
      return this.MakeRaster(width, height);
    }
    const surface = this.CanvasKit.MakeRenderTarget(grContext, width, height);
    if (!surface) {
      throw new SkiaOutOfMemoryError(
        `MakeOffscreen: no GPU memory for a ${width}x${height} surface`
      );
    }
    return new JsiSkSurface(this.CanvasKit, surface, shared.lease());
  }

  MakeFromGPUTexture(_texture: GPUTextureHandle): SkSurface {
    return throwNotImplementedOnRNWeb<SkSurface>();
  }
}
