import Rea from "../external/reanimated/ReanimatedProxy";
import type { Skia } from "../skia/types";
import {
  HAS_REANIMATED_3,
  HAS_REANIMATED_4,
  REANIMATED_VERSION_MAJOR,
} from "../external/reanimated/renderHelpers";

import { ReanimatedRecorder } from "./Recorder/ReanimatedRecorder";
import { Container, StaticContainer } from "./StaticContainer";
import { visit } from "./Recorder/Visitor";

import "../skia/NativeSetup";
import "../views/api";

// create local reference for `strictGlobal` option in Worklets
const { SkiaViewApi } = globalThis;

/**
 * Records the scene graph on the JS thread and hands the native recorder to
 * the view, which owns it and replays it on every draw. The Reanimated mapper
 * only pushes the shared values into that recorder through the view id: no
 * Skia object is captured by a worklet, so nothing on the UI runtime holds
 * native memory. The JS wrapper is disposed right after the handoff, so the
 * view is the sole owner and the resources referenced by the recording
 * (images, pictures) are released when the view replaces it or is torn down,
 * not when a garbage collector gets around to a wrapper.
 *
 * Unmounting does not clear the view: the native view can outlive the React
 * tree (exit animations, screen transitions) and keeps showing its last frame
 * until it is torn down, which is when the recording is released.
 */
class NativeReanimatedContainer extends Container {
  private mapperId: number | null = null;

  constructor(
    Skia: Skia,
    private nativeId: number
  ) {
    super(Skia);
  }

  private stopMapper() {
    if (this.mapperId !== null) {
      Rea.stopMapper(this.mapperId);
      this.mapperId = null;
    }
  }

  unmount() {
    super.unmount();
    this.stopMapper();
  }

  redraw() {
    this.stopMapper();
    if (this.unmounted) {
      return;
    }
    const recorder = new ReanimatedRecorder(this.Skia);
    visit(recorder, this.root);
    const sharedValues = recorder.getSharedValues();
    const { nativeId } = this;
    const nativeRecorder = recorder.getRecorder();
    // stopMapper() only takes effect on the UI thread later, so the previous
    // mapper can still fire after the new recording is installed. Tagging the
    // updates with the recording id lets the view ignore them.
    const recorderId = nativeRecorder.getId();
    // The view takes ownership of the recorder and draws the first frame. The
    // wrapper is disposed right away: it would otherwise co-own the recording
    // until the JS garbage collector finalizes it.
    // Let the mapper produce the first frame after derived values update.
    SkiaViewApi.setJsiProperty(
      nativeId,
      "recorder",
      nativeRecorder,
      sharedValues.length === 0
    );
    nativeRecorder.dispose();
    if (sharedValues.length > 0) {
      this.mapperId = Rea.startMapper(() => {
        "worklet";
        SkiaViewApi.applyUpdates(nativeId, recorderId, sharedValues);
      }, sharedValues);
    }
  }
}

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

export const createContainer = (Skia: Skia, nativeId: number) => {
  if (HAS_REANIMATED_4 && nativeId !== -1) {
    return new NativeReanimatedContainer(Skia, nativeId);
  } else {
    if (HAS_REANIMATED_3 && !HAS_REANIMATED_4) {
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
    }
    return new StaticContainer(Skia, nativeId);
  }
};
