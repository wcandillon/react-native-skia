import Rea from "../external/reanimated/ReanimatedProxy";
import type { JsiRecorder, SkCanvas, Skia, SkPicture } from "../skia/types";
import {
  HAS_REANIMATED_3,
  HAS_REANIMATED_4,
  REANIMATED_VERSION_MAJOR,
} from "../external/reanimated/renderHelpers";

import { Container } from "./StaticContainer";
import { visit } from "./Recorder/Visitor";

import "../skia/NativeSetup";
import "../views/api";

// create local reference for `strictGlobal` option in Worklets
const { SkiaViewApi } = globalThis;

let hasWarnedAboutReanimatedSupport = false;

const reanimatedSupportError = () => {
  if (REANIMATED_VERSION_MAJOR !== null && REANIMATED_VERSION_MAJOR >= 4) {
    return (
      "React Native Skia requires react-native-worklets >= 0.7.0 for its " +
      "Reanimated integration on native platforms. Reanimated 4 is " +
      "installed, but react-native-worklets is missing or too old. " +
      "Please install or upgrade react-native-worklets."
    );
  }
  return (
    "React Native Skia requires Reanimated 4 (react-native-worklets >= " +
    "0.7.0) for its Reanimated integration on native platforms. " +
    "Reanimated 3 is not supported anymore: Skia objects cannot be used " +
    "inside worklets or shared values with it. " +
    "Please upgrade to react-native-reanimated >= 4.0.0."
  );
};

const reportUnsupportedReanimated = () => {
  const message = reanimatedSupportError();
  if (__DEV__) {
    // Fail loudly in development — a silent fallback to static rendering
    // would only be noticed as frozen animations.
    throw new Error(message);
  }
  if (!hasWarnedAboutReanimatedSupport) {
    hasWarnedAboutReanimatedSupport = true;
    console.error(
      `${message} Falling back to static rendering (animations will not run).`
    );
  }
};

/**
 * Records the scene graph into the native recorder, on the JS thread, once
 * per React commit that changes it and once per render() (Reconciler.ts).
 *
 * On screen, the recorder is handed to the view, which owns it and replays it
 * on the render thread pool. The Reanimated mapper only pushes the shared
 * values into that recorder through the view id: no Skia object is captured
 * by a worklet, so nothing on the UI runtime holds native memory. The JS
 * wrapper is disposed right after the handoff, so the view is the sole owner
 * and the resources referenced by the recording (images, pictures) are
 * released when the view replaces it or is torn down, not when a garbage
 * collector gets around to a wrapper. A recording without shared values is
 * turned into a picture by the view.
 *
 * Recording reads no shared value: on Reanimated 4, a read on the JS thread
 * is a blocking round trip to the UI thread, and reading a picture held by a
 * shared value wraps it for the JS runtime (a wrapper per commit, charged to
 * the garbage collector). The mapper runs once as it starts and reads every
 * shared value on the UI thread, at the same moment; the view draws the
 * recording from that first read on (see RNSkGraphiteProducer) and keeps
 * showing the previous frame until then.
 *
 * Unmounting does not clear the view: the native view can outlive the React
 * tree (exit animations, screen transitions) and keeps showing its last frame
 * until it is torn down, which is when the recording is released.
 *
 * Offscreen (no view), the recording is played into a picture right away,
 * which drawOnCanvas() draws.
 */
class NativeContainer extends Container {
  private mapperId: number | null = null;
  private picture: SkPicture | null = null;
  /** The recording the view owns and its shared values, if any. */
  private installed: {
    recorderId: number;
    sharedValues: ReturnType<JsiRecorder["getSharedValues"]>;
  } | null = null;

  private stopMapper() {
    if (this.mapperId !== null) {
      Rea.stopMapper(this.mapperId);
      this.mapperId = null;
    }
  }

  unmount() {
    super.unmount();
    this.stopMapper();
    this.installed = null;
    this.picture?.dispose();
    this.picture = null;
  }

  protected drawFrame(canvas: SkCanvas) {
    if (!this.picture) {
      throw new Error("No recording to draw");
    }
    canvas.drawPicture(this.picture);
  }

  redraw() {
    this.stopMapper();
    this.installed = null;
    if (this.unmounted) {
      // The unmount commit triggers a last redraw: recording it would
      // resurrect a recording for a container that has just let go of it.
      return;
    }
    const recorder = this.Skia.Recorder();
    try {
      visit(recorder, this.root);
      if (this.nativeId === -1) {
        // No mapper will update the picture: it is played with the current
        // values of the shared values, which makePicture() reads on this
        // thread (it needs the recorder to still hold them). The previous
        // frame stays until the new one is recorded.
        const picture = recorder.makePicture();
        this.picture?.dispose();
        this.picture = picture;
      } else {
        this.installRecording(recorder);
      }
    } finally {
      // The wrapper is disposed right away: it would otherwise co-own the
      // recording until the JS garbage collector finalizes it.
      recorder.dispose();
    }
  }

  /**
   * Hands the recording to the view, which owns it from here on, and drives
   * its shared values from the UI thread.
   */
  private installRecording(recorder: JsiRecorder) {
    const { nativeId } = this;
    const sharedValues = recorder.getSharedValues();
    // stopMapper() only takes effect on the UI thread later, so the previous
    // mapper can still fire after the new recording is installed. Tagging the
    // updates with the recording id lets the view ignore them.
    const recorderId = recorder.getId();
    // The view takes ownership of the recorder and draws it (right away for a
    // static scene, from the first update on otherwise).
    SkiaViewApi.setJsiProperty(nativeId, "recorder", recorder);
    if (sharedValues.length === 0) {
      return;
    }
    this.installed = { recorderId, sharedValues };
    if (!HAS_REANIMATED_4) {
      // No mapper will read the shared values (createContainer() reported
      // it): read them once, here, so that the view can draw the scene with
      // their current values.
      SkiaViewApi.applyUpdates(nativeId, recorderId, sharedValues);
      return;
    }
    // A mapper runs once when it starts: that run reads every shared value on
    // the UI thread and draws the first frame of this recording.
    this.mapperId = Rea.startMapper(() => {
      "worklet";
      SkiaViewApi.applyUpdates(nativeId, recorderId, sharedValues);
    }, sharedValues);
  }

  /**
   * Reads the shared values of the recording the view owns, on this thread:
   * a snapshot taken before the mapper's first run (in the commit that
   * installed the recording) would otherwise draw the previous frame, and
   * one taken later draws the values as of now rather than as of the last
   * mapper run. Snapshots are rare, so the Reanimated 4 round trips to the
   * UI thread are affordable here.
   */
  readSharedValues() {
    if (this.installed === null) {
      return;
    }
    const { recorderId, sharedValues } = this.installed;
    SkiaViewApi.applyUpdates(this.nativeId, recorderId, sharedValues);
  }
}

/**
 * Reanimated support is checked here, in the render phase (Canvas creates its
 * root in useMemo), where an error boundary can catch the development error.
 * The container's redraw() runs in React's commit phase, where it could not.
 */
export const createContainer = (Skia: Skia, nativeId: number) => {
  if (HAS_REANIMATED_3 && !HAS_REANIMATED_4) {
    reportUnsupportedReanimated();
  }
  return new NativeContainer(Skia, nativeId);
};
