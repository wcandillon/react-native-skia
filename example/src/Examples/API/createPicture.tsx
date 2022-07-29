import React from "react";
import type { SkRect } from "@shopify/react-native-skia";
import {
  ValueApi,
  CanvasProvider,
  skHostConfig,
  Container,
  DependencyManager,
  Skia,
} from "@shopify/react-native-skia";
import type { DrawingContext } from "@shopify/react-native-skia/src/renderer/DrawingContext";
import type { ReactNode } from "react";
import ReactReconciler from "react-reconciler";

const redraw = () => {};
const ref = { current: null };

const skiaReconciler = ReactReconciler(skHostConfig);

export const createPicture = (element: ReactNode, bounds: SkRect) => {
  const { width, height } = bounds;
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(bounds);
  const container = new Container(new DependencyManager(ref), redraw);
  skiaReconciler.createContainer(container, 0, false, null);
  const root = skiaReconciler.createContainer(container, 0, false, null);
  skiaReconciler.updateContainer(
    <CanvasProvider
      value={{ Skia, size: ValueApi.createValue({ width, height }) }}
    >
      {element}
    </CanvasProvider>,
    root,
    null,
    () => {}
  );
  const ctx: DrawingContext = {
    width,
    height,
    timestamp: 0,
    canvas,
    paint: Skia.Paint(),
    opacity: 1,
    ref,
    center: Skia.Point(width / 2, height / 2),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    fontMgr: null,
    Skia,
  };
  container.draw(ctx);
  return recorder.finishRecordingAsPicture();
};
