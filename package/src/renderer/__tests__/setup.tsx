/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";

import React from "react";
import type { ReactNode } from "react";
import ReactReconciler from "react-reconciler";

import { DependencyManager } from "../DependencyManager";
import { skHostConfig } from "../HostConfig";
import { Container } from "../Container";
import type { DrawingContext } from "../DrawingContext";
import { CanvasProvider } from "../useCanvas";
import { ValueApi } from "../../values/web";
import { LoadSkiaWeb } from "../../web/LoadSkiaWeb";
import type * as SkiaExports from "../..";
import { SkiaView } from "../../views/SkiaView.web";
import { JsiSkApi } from "../../skia/web/JsiSkia";
import { JsiSkDOM } from "../../dom/nodes";

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const resolveFile = (uri: string) =>
  fs.readFileSync(path.resolve(__dirname, `../../${uri}`));

(global as any).fetch = jest.fn((uri: string) =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(resolveFile(uri)),
  })
);

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmptyProps {}

jest.mock("react-native", () => ({
  PixelRatio: {
    get(): number {
      return 1;
    },
  },
  Platform: { OS: "web" },
  Image: {
    resolveAssetSource: jest.fn,
  },
  requireNativeComponent: jest.fn,
}));

export const loadImage = (uri: string) => {
  const Skia = global.SkiaApi;
  const image = Skia.Image.MakeImageFromEncoded(
    Skia.Data.fromBytes(resolveFile(uri))
  );
  expect(image).toBeTruthy();
  return image!;
};

export const loadFont = (uri: string, ftSize?: number) => {
  const Skia = global.SkiaApi;
  const tf = Skia.Typeface.MakeFreeTypeFaceFromData(
    Skia.Data.fromBytes(resolveFile(uri))
  );
  expect(tf).toBeTruthy();
  const font = Skia.Font(tf!, ftSize ?? fontSize);
  return font;
};

export const importSkia = (): typeof SkiaExports => require("../..");
export const getSkDOM = () => {
  const { Skia } = importSkia();
  const depMgr = new DependencyManager(() => () => {});
  return new JsiSkDOM({ Skia, depMgr });
};

beforeAll(async () => {
  await LoadSkiaWeb();
  const Skia = JsiSkApi(global.CanvasKit);
  global.SkiaApi = Skia;
  global.SkiaValueApi = ValueApi;
});

export const PIXEL_RATIO = 3;
export const fontSize = 32 * PIXEL_RATIO;
export const width = 256 * PIXEL_RATIO;
export const height = 256 * PIXEL_RATIO;
export const center = { x: width / 2, y: height / 2 };
const redraw = () => {};

const skiaReconciler = ReactReconciler(skHostConfig);

skiaReconciler.injectIntoDevTools({
  bundleType: 1,
  version: "0.0.1",
  rendererPackageName: "react-native-skia",
});

export const drawOnNode = (element: ReactNode) => {
  const { surface, draw } = mountCanvas(element);
  draw();
  return surface;
};

export const mountCanvas = (element: ReactNode) => {
  const Skia = global.SkiaApi;
  expect(Skia).toBeDefined();
  const surface = Skia.Surface.Make(width, height)!;
  expect(surface).toBeDefined();
  const canvas = surface.getCanvas();
  expect(canvas).toBeDefined();
  expect(element).toBeDefined();

  const ref = {
    current: new SkiaView({}) as any,
  };
  const registerValues = (values: Array<SkiaExports.SkiaValue<unknown>>) => {
    if (ref.current === null) {
      throw new Error("Canvas ref is not set");
    }
    return ref.current.registerValues(values);
  };

  const depMgr = new DependencyManager(registerValues);
  const container = new Container(Skia, depMgr, redraw);
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
    () => {
      container.depMgr.update();
    }
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
    Skia,
  };
  return {
    draw: () => {
      container.draw(ctx);
    },
    surface,
    container,
  };
};
