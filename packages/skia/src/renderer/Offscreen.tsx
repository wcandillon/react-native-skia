import type { ReactElement } from "react";

import type { SkImage, SkPicture, SkRect, SkSize } from "../skia/types";
import { Skia } from "../skia";
import { Platform } from "../Platform";
import { SkiaSGRoot } from "../sksg/Reconciler";

// react-native-worklets' RuntimeKind.ReactNative; every worklet runtime has another kind.
const REACT_NATIVE_RUNTIME_KIND = 1;

export const isOnMainThread = () => {
  "worklet";
  const runtimeKind = globalThis.__RUNTIME_KIND;
  return (
    (runtimeKind !== undefined && runtimeKind !== REACT_NATIVE_RUNTIME_KIND) ||
    Platform.OS === "web"
  );
};

export const drawAsPicture = async (element: ReactElement, bounds?: SkRect) => {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(bounds);
  const root = new SkiaSGRoot(Skia);
  await root.render(element);
  root.drawOnCanvas(canvas);
  const picture = recorder.finishRecordingAsPicture();
  recorder.dispose();
  root.unmount();
  return picture;
};

export const drawAsImage = async (
  element: ReactElement,
  size: SkSize
): Promise<SkImage> => {
  return drawAsImageFromPicture(await drawAsPicture(element), size);
};

// Resolves to a CPU image of the picture: the snapshot is read back from
// the GPU, on the runtime that called (the JS thread or a worklet runtime).
export const drawAsImageFromPicture = (
  picture: SkPicture,
  size: SkSize
): Promise<SkImage> => {
  "worklet";
  const surface = Skia.Surface.MakeOffscreen(size.width, size.height)!;
  const canvas = surface.getCanvas();
  canvas.drawPicture(picture);
  surface.flush();
  const image = surface.makeImageSnapshot();
  return image.makeRasterImage();
};
