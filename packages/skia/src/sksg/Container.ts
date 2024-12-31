import { type SharedValue } from "react-native-reanimated";

import Rea from "../external/reanimated/ReanimatedProxy";
import type { Skia, SkCanvas } from "../skia/types";
import {
  HAS_REANIMATED,
  HAS_REANIMATED_3,
} from "../external/reanimated/renderHelpers";

import { createDrawingContext } from "./DrawingContext";
import type { Node } from "./nodes";
import { draw, isSharedValue } from "./nodes";

const drawOnscreen = (Skia: Skia, nativeId: number, root: Node[]) => {
  "worklet";
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording();
  // TODO: This is only support from 3.15 and above (check the exact version)
  // This could be polyfilled in C++ if needed (or in JS via functions only?)
  const ctx = createDrawingContext(Skia, canvas);
  root.forEach((node) => {
    draw(ctx, node);
  });
  const picture = rec.finishRecordingAsPicture();
  SkiaViewApi.setJsiProperty(nativeId, "picture", picture);
};

export class Container {
  public _root: Node[] = [];
  public unmounted = false;

  private values = new Set<SharedValue<unknown>>();
  private mapperId: number | null = null;

  constructor(public Skia: Skia, private nativeId: number) {}

  get root() {
    return this._root;
  }

  set root(root: Node[]) {
    const isOnscreen = this.nativeId !== -1;
    if (HAS_REANIMATED && !HAS_REANIMATED_3) {
      throw new Error("React Native Skia only supports Reanimated 3 and above");
    }
    if (isOnscreen) {
      if (this.mapperId !== null) {
        Rea.stopMapper(this.mapperId);
      }
      const { nativeId, Skia } = this;
      this.mapperId = Rea.startMapper(() => {
        "worklet";
        drawOnscreen(Skia, nativeId, root);
      }, Array.from(this.values));
    }
    this._root = root;
  }

  clear() {
    console.log("clear container");
  }

  redraw() {
    const isOnscreen = this.nativeId !== -1;
    if (HAS_REANIMATED && !HAS_REANIMATED_3) {
      throw new Error("React Native Skia only supports Reanimated 3 and above");
    }
    if (isOnscreen) {
      const { nativeId, Skia, root } = this;
      Rea.runOnUI(() => {
        drawOnscreen(Skia, nativeId, root);
      })();
    }
  }

  getNativeId() {
    return this.nativeId;
  }

  unregisterValues(values: object) {
    Object.values(values)
      .filter(isSharedValue)
      .forEach((value) => {
        this.values.delete(value);
      });
  }

  registerValues(values: object) {
    Object.values(values)
      .filter(isSharedValue)
      .forEach((value) => {
        this.values.add(value);
      });
  }

  drawOnCanvas(canvas: SkCanvas) {
    const ctx = createDrawingContext(this.Skia, canvas);
    this.root.forEach((node) => {
      draw(ctx, node);
    });
  }
}
