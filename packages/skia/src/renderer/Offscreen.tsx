import type { ReactElement } from "react";

import { JsiDrawingContext } from "../dom/types";
import type { SkPicture, SkRect, SkSize } from "../skia/types";
import { Skia } from "../skia";
import { Platform } from "../Platform";

import { SkiaRoot } from "./Reconciler";

// We call it main thread because on web main is JS thread
export const isOnMainThread = () => {
  "worklet";
  return (
    (typeof _WORKLET !== "undefined" && _WORKLET === true) ||
    Platform.OS === "web"
  );
};

export const drawAsPicture = (element: ReactElement, bounds?: SkRect) => {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(bounds);
  const root = new SkiaRoot(Skia, false);
  root.render(element);
  const ctx = new JsiDrawingContext(Skia, canvas);
  root.dom.render(ctx);
  const picture = recorder.finishRecordingAsPicture();
  root.unmount();
  return picture;
};

export const drawAsImage = (element: ReactElement, size: SkSize) => {
  return drawAsImageFromPicture(drawAsPicture(element), size);
};

export const drawAsImageFromPicture = (picture: SkPicture, size: SkSize) => {
  "worklet";
  const surface = Skia.Surface.MakeOffscreen(size.width, size.height);
  if (surface === null) {
    throw new Error("Could not create offscreen surface");
  }
  const canvas = surface.getCanvas();
  canvas.drawPicture(picture);
  surface.flush();
  const image = surface.makeImageSnapshot();
  // If we are not on the main thread or if we are on Web, we need to make the image non-texture.
  if (!isOnMainThread() || Platform.OS === "web") {
    return image.makeNonTextureImage();
  } else {
    return image;
  }
};
