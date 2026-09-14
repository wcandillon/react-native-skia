import Rea from "../external/reanimated/ReanimatedProxy";
import type { Skia } from "../skia/types";
import { HAS_REANIMATED_3 } from "../external/reanimated/renderHelpers";

import type { Recording } from "./Recorder/Recorder";
import { Recorder, disposeRecording } from "./Recorder/Recorder";
import { visit } from "./Recorder/Visitor";
import { replay } from "./Recorder/Player";
import { createDrawingContext } from "./Recorder/DrawingContext";
import { Container, StaticContainer } from "./StaticContainer";

import "../skia/NativeSetup";
import "../views/api";

// create local reference for `strictGlobal` option in Worklets
const { SkiaViewApi } = globalThis;

const drawOnscreen = (Skia: Skia, nativeId: number, recording: Recording) => {
  "worklet";
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording();
  //const start = performance.now();

  const ctx = createDrawingContext(Skia, recording.paintPool, canvas);
  let picture;
  try {
    replay(ctx, recording.commands);
    picture = rec.finishRecordingAsPicture();
  } finally {
    // Frame-scoped objects (shaders, filters, paint copies, ...) are
    // referenced by the picture once it is finished — delete the JS handles,
    // otherwise they leak on Web where the GC cannot see WASM memory.
    ctx.dispose();
    rec.dispose();
  }
  //const end = performance.now();
  //console.log("Recording time: ", end - start);
  SkiaViewApi.setJsiProperty(nativeId, "picture", picture);
  // The view now references the new picture; the previous one is ours to
  // delete.
  recording.lastPicture?.dispose();
  recording.lastPicture = picture;
};

class ReanimatedContainer extends Container {
  private mapperId: number | null = null;

  constructor(
    Skia: Skia,
    private nativeId: number
  ) {
    super(Skia);
  }

  unmount() {
    super.unmount();
    if (this.mapperId !== null) {
      // The mapper closure retains the recording and keeps updating the
      // picture of an unmounted view — stop it or it leaks for the
      // lifetime of the app.
      Rea.stopMapper(this.mapperId);
      this.mapperId = null;
    }
    const { recording } = this;
    if (recording) {
      this.recording = null;
      // Deferred through the same channel as the draw calls so it runs after
      // any of them that are still queued.
      Rea.runOnUI(() => {
        "worklet";
        disposeRecording(recording);
      })();
    }
  }

  redraw() {
    if (this.mapperId !== null) {
      Rea.stopMapper(this.mapperId);
      this.mapperId = null;
    }
    if (this.unmounted) {
      return;
    }
    const previousRecording = this.recording;
    const recorder = new Recorder();
    visit(recorder, this.root);
    const record = recorder.getRecording();
    const { animationValues } = record;
    this.recording = {
      commands: record.commands,
      paintPool: record.paintPool,
    };
    const { nativeId, Skia, recording } = this;
    if (animationValues.size > 0) {
      this.mapperId = Rea.startMapper(() => {
        "worklet";
        drawOnscreen(Skia, nativeId, recording!);
      }, Array.from(animationValues));
    }
    Rea.runOnUI(() => {
      "worklet";
      if (previousRecording) {
        // Runs after any still-queued draw of the previous recording.
        disposeRecording(previousRecording);
      }
      drawOnscreen(Skia, nativeId, recording!);
    })();
  }
}

export const createContainer = (Skia: Skia, nativeId: number) => {
  if (HAS_REANIMATED_3 && nativeId !== -1) {
    return new ReanimatedContainer(Skia, nativeId);
  } else {
    return new StaticContainer(Skia, nativeId);
  }
};
