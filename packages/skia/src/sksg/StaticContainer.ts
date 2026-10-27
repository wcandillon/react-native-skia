import type { Skia, SkCanvas } from "../skia/types";

import type { Node } from "./Node";
import type { Recording } from "./Recorder/Recorder";
import { Recorder, disposeRecording } from "./Recorder/Recorder";
import { visit } from "./Recorder/Visitor";
import { replay } from "./Recorder/Player";
import { createDrawingContext } from "./Recorder/DrawingContext";

import "../views/api";

/**
 * Holds the scene graph that React commits and turns it into frames:
 * recordAfterCommit() records a frame after every commit that changes it and
 * every render() (Reconciler.ts), drawOnCanvas() draws the last one
 * (offscreen rendering).
 */
export abstract class Container {
  private _root: Node[] = [];
  protected unmounted = false;
  private recordingError: { error: unknown } | null = null;
  private _recordCount = 0;

  constructor(
    protected Skia: Skia,
    /** The view the frames go to, -1 when rendering offscreen. */
    protected readonly nativeId: number
  ) {}

  get root() {
    return this._root;
  }

  set root(value: Node[]) {
    this._root = value;
  }

  mount() {
    this.unmounted = false;
  }

  unmount() {
    this.unmounted = true;
  }

  /** How many times recordAfterCommit() has been called. */
  get recordCount() {
    return this._recordCount;
  }

  /**
   * Records the committed scene graph. React applies the host mutations of a
   * commit, calls this (resetAfterCommit), and only then swaps the committed
   * fiber tree in: an exception escaping here would leave the root
   * inconsistent, out of reach of every error boundary. A recording that
   * fails is reported instead. On screen, the view keeps its last frame;
   * offscreen, drawOnCanvas() throws the error, since it asks for that very
   * frame.
   */
  recordAfterCommit() {
    this._recordCount++;
    try {
      this.redraw();
      this.recordingError = null;
    } catch (error) {
      this.recordingError = { error };
      if (this.nativeId !== -1) {
        console.error(error);
      }
    }
  }

  drawOnCanvas(canvas: SkCanvas) {
    if (this.recordingError) {
      throw this.recordingError.error;
    }
    this.drawFrame(canvas);
  }

  /**
   * Reads the shared values of the frame on screen on this thread, so that a
   * snapshot taken now draws their current values. Only the native container
   * defers their reads (see Container.native.ts).
   */
  readSharedValues() {}

  /** Draws the last recorded frame. */
  protected abstract drawFrame(canvas: SkCanvas): void;

  /** Records the scene graph into a new frame. */
  abstract redraw(): void;
}

/**
 * A container that records the scene graph into a JS command list and
 * replays it with the JS player: the web and node renderer. On native the
 * scene is recorded into the native recorder instead (Container.native.ts).
 */
export abstract class JsContainer extends Container {
  protected recording: Recording | null = null;

  protected drawFrame(canvas: SkCanvas) {
    if (!this.recording) {
      throw new Error("No recording to draw");
    }
    const ctx = createDrawingContext(
      this.Skia,
      this.recording.paintPool,
      canvas
    );
    try {
      replay(ctx, this.recording.commands);
    } finally {
      // Frame-scoped objects created during the replay are no longer needed
      // once drawn — delete them, otherwise they leak on Web where the GC
      // cannot see WASM memory.
      ctx.dispose();
    }
  }
}

export class StaticContainer extends JsContainer {
  unmount() {
    super.unmount();
    if (this.recording) {
      disposeRecording(this.recording);
      this.recording = null;
    }
  }

  redraw() {
    if (this.unmounted) {
      // The unmount commit triggers a last redraw — recording it would
      // resurrect a recording for a container that has just disposed it.
      return;
    }
    if (this.recording) {
      disposeRecording(this.recording);
      this.recording = null;
    }
    const recorder = new Recorder();
    visit(recorder, this.root);
    this.recording = recorder.getRecording();
    const isOnScreen = this.nativeId !== -1;
    if (isOnScreen) {
      const rec = this.Skia.PictureRecorder();
      const canvas = rec.beginRecording();
      this.drawFrame(canvas);
      const picture = rec.finishRecordingAsPicture();
      rec.dispose();
      SkiaViewApi.setJsiProperty(this.nativeId, "picture", picture);
      // The view keeps its own reference to the picture it displays; this
      // one is renderer-owned and disposed with the recording.
      this.recording.lastPicture = picture;
    }
  }
}
