import Rea from "../external/reanimated/ReanimatedProxy";
import type { Skia, SkPicture } from "../skia/types";
import {
  HAS_REANIMATED_3,
  HAS_REANIMATED_4,
  REANIMATED_VERSION_MAJOR,
} from "../external/reanimated/renderHelpers";
import type { JsiRecorder } from "../skia/types/Recorder";

import { ReanimatedRecorder } from "./Recorder/ReanimatedRecorder";
import { Container, StaticContainer } from "./StaticContainer";
import { visit } from "./Recorder/Visitor";

import "../skia/NativeSetup";
import "../views/api";

// create local reference for `strictGlobal` option in Worklets
const { SkiaViewApi } = globalThis;

const nativeDrawOnscreen = (
  nativeId: number,
  recorder: JsiRecorder,
  picture: SkPicture
) => {
  "worklet";

  //const start = performance.now();
  recorder.play(picture);
  //const end = performance.now();
  //console.log("Recording time: ", end - start);
  SkiaViewApi.setJsiProperty(nativeId, "picture", picture);
};

class NativeReanimatedContainer extends Container {
  private mapperId: number | null = null;
  private picture: SkPicture;

  constructor(
    Skia: Skia,
    private nativeId: number
  ) {
    super(Skia);
    this.picture = Skia.Picture.MakePicture(null)!;
  }

  unmount() {
    super.unmount();
    if (this.mapperId !== null) {
      // The mapper closure retains the recorder and its resources (e.g.
      // images) on the UI runtime and keeps updating the picture of an
      // unmounted view — stop it or it leaks for the lifetime of the app.
      Rea.stopMapper(this.mapperId);
      this.mapperId = null;
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
    const recorder = new ReanimatedRecorder(this.Skia);
    const { nativeId, picture } = this;
    visit(recorder, this.root);
    const sharedValues = recorder.getSharedValues();
    const sharedRecorder = recorder.getRecorder();
    // Draw first frame
    Rea.runOnUI(() => {
      "worklet";
      nativeDrawOnscreen(nativeId, sharedRecorder, picture);
    })();
    // Animate
    if (sharedValues.length > 0) {
      this.mapperId = Rea.startMapper(() => {
        "worklet";
        sharedRecorder.applyUpdates(sharedValues);
        nativeDrawOnscreen(nativeId, sharedRecorder, picture);
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
