import type { CanvasKit } from "canvaskit-wasm";

import type { GPUTextureHandle, SkSurface, SurfaceFactory } from "../types";

import { Host, throwNotImplementedOnRNWeb } from "./Host";
import { JsiSkSurface } from "./JsiSkSurface";
import { getSharedWebGLContext } from "./SharedWebGLContext";

export class JsiSkSurfaceFactory extends Host implements SurfaceFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeRaster(width: number, height: number) {
    return new JsiSkSurface(
      this.CanvasKit,
      this.CanvasKit.MakeSurface(width, height)!
    );
  }

  // A render target on the WebGL context the page shares with its views
  // (see SharedWebGLContext): no context of its own, and a snapshot of it
  // can be drawn by any view.
  MakeOffscreen(width: number, height: number) {
    const shared = getSharedWebGLContext(this.CanvasKit);
    if (!shared) {
      // No canvas to be had (Node): draw on the CPU.
      return this.MakeRaster(width, height);
    }
    const grContext = shared.getGrContext();
    if (!grContext) {
      // The context is lost; nothing can be built until the browser
      // restores it.
      return null;
    }
    const surface = this.CanvasKit.MakeRenderTarget(grContext, width, height);
    if (!surface) {
      return null;
    }
    return new JsiSkSurface(this.CanvasKit, surface, shared.lease());
  }

  MakeFromGPUTexture(_texture: GPUTextureHandle): SkSurface {
    return throwNotImplementedOnRNWeb<SkSurface>();
  }
}
