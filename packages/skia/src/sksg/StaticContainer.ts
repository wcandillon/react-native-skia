import type { Skia, SkCanvas } from "../skia/types";

import type { Node } from "./Node";
import type { Recording } from "./Recorder/Recorder";
import { Recorder, disposeRecording } from "./Recorder/Recorder";
import { visit } from "./Recorder/Visitor";
import { replay } from "./Recorder/Player";
import { createDrawingContext } from "./Recorder/DrawingContext";

import "../views/api";

export abstract class Container {
  private _root: Node[] = [];
  protected recording: Recording | null = null;
  protected unmounted = false;

  constructor(protected Skia: Skia) {}

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

  drawOnCanvas(canvas: SkCanvas) {
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

  abstract redraw(): void;
}

export class StaticContainer extends Container {
  constructor(
    Skia: Skia,
    private nativeId: number
  ) {
    super(Skia);
  }

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
      this.drawOnCanvas(canvas);
      const picture = rec.finishRecordingAsPicture();
      rec.dispose();
      SkiaViewApi.setJsiProperty(this.nativeId, "picture", picture);
      // The view keeps its own reference to the picture it displays; this
      // one is renderer-owned and disposed with the recording.
      this.recording.lastPicture = picture;
    }
  }
}
