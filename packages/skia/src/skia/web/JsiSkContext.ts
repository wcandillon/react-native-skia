import type { CanvasKit } from "canvaskit-wasm";

import type {
  ContextFactory,
  ProducerOptions,
  ProducerStats,
  SkCanvas,
  SkDeferredTargetInfo,
} from "../types";

import { Host } from "./Host";
import { JsiSkRecording } from "./JsiSkRecording";
import { JsiSkSurface } from "./JsiSkSurface";

interface PendingTarget {
  surface: JsiSkSurface;
  width: number;
  height: number;
  highBitDepth: boolean;
}

/**
 * Web fallback of Skia.Context (CanvasKit has no Graphite Recording): the
 * deferred canvas is the canvas of a raster surface of the requested size and
 * snap() wraps that surface in a recording token. A raster surface rather
 * than a WebGL one: browsers cap live WebGL contexts and a producer may snap
 * sixty times per second.
 */
export class JsiSkContext extends Host implements ContextFactory {
  readonly isSupported = false;

  setThreadPriority(_level: "high" | "normal" | "low") {
    // Browsers do not expose thread priorities.
  }

  startProducer(_options: ProducerOptions) {
    throw new Error("Skia.Context.startProducer() is native only");
  }

  setProducerEnabled(_enabled: boolean[]) {}

  stopProducer() {}

  getProducerStats(): ProducerStats {
    return { batchMs: 0, batches: 0, threads: 0 };
  }

  private pending: PendingTarget | null = null;

  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  makeDeferredCanvas(info: SkDeferredTargetInfo): SkCanvas {
    if (this.pending !== null) {
      throw new Error(
        "makeDeferredCanvas: a deferred canvas is already open; call Skia.Context.snap() before making another one"
      );
    }
    const width = Math.floor(info.width);
    const height = Math.floor(info.height);
    if (!(width > 0) || !(height > 0)) {
      throw new Error("makeDeferredCanvas: width and height must be > 0");
    }
    const surface = this.CanvasKit.MakeSurface(width, height);
    if (!surface) {
      throw new Error("makeDeferredCanvas: could not create a surface");
    }
    this.pending = {
      surface: new JsiSkSurface(this.CanvasKit, surface),
      width,
      height,
      highBitDepth: info.highBitDepth === true,
    };
    return this.pending.surface.getCanvas();
  }

  snap(): JsiSkRecording {
    const pending = this.pending;
    this.pending = null;
    if (pending === null) {
      return new JsiSkRecording(this.CanvasKit, null, 0, 0, false);
    }
    pending.surface.flush();
    return new JsiSkRecording(
      this.CanvasKit,
      pending.surface,
      pending.width,
      pending.height,
      pending.highBitDepth
    );
  }
}
