// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit";
import type { ReactNode } from "react";

import type { SkSurface } from "../skia";
import { JsiSkApi } from "../skia/web";
import { SkiaSGRoot } from "../sksg/Reconciler";

export * from "../renderer/components";
export * from "../skia/types";

let Skia: ReturnType<typeof JsiSkApi>;

export const makeOffscreenSurface = (width: number, height: number) => {
  if (!Skia) {
    Skia = JsiSkApi(CanvasKit);
  }
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (surface === null) {
    throw new Error("Couldn't create surface!");
  }
  return surface;
};

export const getSkiaExports = () => {
  if (!Skia) {
    Skia = JsiSkApi(CanvasKit);
  }
  return { Skia };
};

export const drawOffscreen = async (surface: SkSurface, element: ReactNode) => {
  const root = new SkiaSGRoot(Skia);
  await root.render(element);
  const canvas = surface.getCanvas();
  root.drawOnCanvas(canvas);
  root.unmount();
  surface.flush();
  return surface.makeImageSnapshot();
};
