import type { SkCanvas } from "./Canvas";
import type { SkColor } from "./Color";
import type { SkPicture } from "./Picture";
import type { SkJSIInstance } from "./JsiInstance";

/**
 * Description of the texture a recording is made for. Sizes are in pixels
 * (not points): use the value reported by SkiaRecordingView's onTarget.
 */
export interface SkDeferredTargetInfo {
  width: number;
  height: number;
  /**
   * Selects the swapchain format (16-bit float on Apple, 10-bit on Android).
   * Defaults to false. The view reports the bit depth that is actually in
   * use, which may fall back to 8-bit on devices without support.
   */
  highBitDepth?: boolean;
}

/**
 * A finished frame: everything recorded on the producing thread since the
 * previous snap(), ready to be presented by a SkiaRecordingView whose target
 * matches width, height and highBitDepth exactly.
 */
export interface SkRecording extends SkJSIInstance<"Recording"> {
  /** Target width in pixels (0 when no deferred canvas was recorded). */
  readonly width: number;
  /** Target height in pixels (0 when no deferred canvas was recorded). */
  readonly height: number;
  readonly highBitDepth: boolean;
}

export interface ContextFactory {
  /**
   * True when recordings can be produced and presented (native Graphite
   * builds). False on Ganesh builds and on web, where only the raster
   * fallback of makeDeferredCanvas()/snap() exists.
   */
  readonly isSupported: boolean;
  /**
   * Returns a canvas that records against a texture described by `info`
   * (the texture itself is bound by the view at presentation time). The
   * canvas draws in pixels, starts with the previous contents of the target
   * (call clear() for a clean frame) and is invalid after snap(). At most one
   * deferred canvas can be open per thread: snap() before the next call.
   */
  makeDeferredCanvas(info: SkDeferredTargetInfo): SkCanvas;
  /**
   * Snaps everything recorded on the calling thread since the last snap(),
   * including the open deferred canvas, into a recording. A recording made
   * without a deferred canvas carries no target and is rejected by views.
   */
  snap(): SkRecording;
  /**
   * Sets the scheduling priority of the calling thread. A worklet runtime
   * that produces frames should call this once with "high" from its own
   * thread: runtimes start at normal priority, which on big.LITTLE devices
   * means the little cores. No-op on web.
   */
  setThreadPriority(level: "high" | "normal" | "low"): void;
  /**
   * Benchmark helper: starts native producer threads that animate `picture`
   * (rotating and breathing) in the views `ids`, one frame per view per
   * vsync, with no JS in the loop. "recording" hands Graphite recordings to
   * SkiaRecordingViews; "picture" hands small pictures to SkiaPictureViews.
   * A running producer is stopped first. Native only.
   */
  startProducer(options: ProducerOptions): void;
  /** Slots the running producer draws (all by default), e.g. visible tiles. */
  setProducerEnabled(enabled: boolean[]): void;
  stopProducer(): void;
  getProducerStats(): ProducerStats;
}

export interface ProducerOptions {
  mode: "picture" | "recording";
  /** Producer threads; view `i` belongs to thread `i % threads`. */
  threads: number;
  /** Native view ids in slot order; a negative id is an empty slot. */
  ids: number[];
  /** The picture every view animates, or one per slot with `pictures`. */
  picture?: SkPicture;
  pictures?: SkPicture[];
  /** Fill behind the picture. */
  background?: SkColor;
  /**
   * With `cornerRadius` (points), the frame is `page` outside a rounded rect
   * of `background`, for opaque views that the parent cannot clip.
   */
  page?: SkColor;
  cornerRadius?: number;
  /** Draw the picture six times, mirrored every other time (a wedge field). */
  kaleidoscope?: boolean;
  /**
   * "picture" (default) replays `picture`; "direct" ignores it and draws the
   * same circle layout with drawCircle calls, regenerated from `circles` and
   * `radius` (points), to measure picture playback against direct draws.
   */
  draw?: "picture" | "direct" | "svg";
  circles?: number;
  radius?: number;
  /** "svg" mode: the field as SVG text, parsed into a DOM per thread. */
  svg?: string;
  /**
   * "field" (default) animates the picture(s); "chart" draws `bars` bars and
   * a `bars`-point line per view, all moving, with no picture involved.
   */
  scene?: "field" | "chart";
  bars?: number;
  /** Chart line color. */
  line?: SkColor;
  /**
   * Recording mode only: who presents. "main" (default) hands each recording
   * to its view, which presents it on the main thread at the next vsync;
   * "producer" presents from the producer thread itself, leaving the main
   * thread out of the frame entirely.
   */
  present?: "main" | "producer";
}

export interface ProducerStats {
  /** Milliseconds the slowest thread's last batch took. */
  batchMs: number;
  /** Batches produced so far by the first thread. */
  batches: number;
  threads: number;
}
