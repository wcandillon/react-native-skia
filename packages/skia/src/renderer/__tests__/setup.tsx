/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";

import React from "react";
import type { ReactNode } from "react";
import type { Server, WebSocket } from "ws";

import type * as SkiaExports from "../../index";
import { JsiSkApi } from "../../skia/web/JsiSkia";
import { Group } from "../components";
import type { SkImage, SkFont, Skia, SkCanvas } from "../../skia/types";
import { isPath } from "../../skia/types";
import { E2E } from "../../__tests__/setup";
import { LoadSkiaWeb } from "../../web/LoadSkiaWeb";
import { SkiaSGRoot } from "../../sksg/Reconciler";
import type { Node } from "../../sksg/Node";

import { SkiaObject } from "./e2e/setup";

jest.setTimeout(180 * 1000);

type TestOS = "ios" | "android" | "web" | "node";

declare global {
  var testServer: Server;
  var testClient: WebSocket;
  var testOS: TestOS;
}
export let surface: TestingSurface;
const assets = new Map<SkImage | SkFont, string>();
export let images: {
  oslo: SkImage;
  skiaLogoPng: SkImage;
  skiaLogoJpeg: SkImage;
  mask: SkImage;
};
export let fonts: {
  RobotoMedium: SkFont;
  NotoColorEmoji: SkFont;
  NotoSansSCRegular: SkFont;
  UberMoveMediumMono: SkFont;
  DinMedium: SkFont;
};

beforeAll(async () => {
  await LoadSkiaWeb();
  const Skia = JsiSkApi(global.CanvasKit);
  global.SkiaApi = Skia;
  surface = E2E ? new RemoteSurface() : new LocalSurface();
  const { fontSize } = surface;
  const NotoSansSCRegular = loadFont(
    "skia/__tests__/assets/NotoSansSC-Regular.otf",
    fontSize
  );
  const NotoColorEmoji = loadFont(
    "skia/__tests__/assets/NotoColorEmoji.ttf",
    fontSize
  );
  const RobotoMedium = loadFont(
    "skia/__tests__/assets/Roboto-Medium.ttf",
    fontSize
  );
  const UberMoveMediumMono = loadFont(
    "skia/__tests__/assets/UberMove-Medium_mono.ttf",
    fontSize
  );
  const DinMedium = loadFont("skia/__tests__/assets/DIN-Medium.ttf", fontSize);
  const oslo = loadImage("skia/__tests__/assets/oslo.jpg");
  const skiaLogoPng = loadImage("skia/__tests__/assets/skia_logo.png");
  const skiaLogoJpeg = loadImage("skia/__tests__/assets/skia_logo_jpeg.jpg");
  const mask = loadImage("skia/__tests__/assets/mask.png");
  images = { oslo, skiaLogoPng, skiaLogoJpeg, mask };
  fonts = {
    RobotoMedium,
    NotoColorEmoji,
    NotoSansSCRegular,
    UberMoveMediumMono,
    DinMedium,
  };
  assets.set(mask, "mask");
  assets.set(oslo, "oslo");
  assets.set(RobotoMedium, "RobotoMedium");
  assets.set(NotoColorEmoji, "NotoColorEmoji");
  assets.set(NotoSansSCRegular, "NotoSansSCRegular");
  assets.set(UberMoveMediumMono, "UberMoveMediumMono");
  assets.set(DinMedium, "DinMedium");
  assets.set(skiaLogoPng, "skiaLogoPng");
  assets.set(skiaLogoJpeg, "skiaLogoJpeg");
});

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const resolveFile = (uri: string) =>
  fs.readFileSync(path.resolve(__dirname, `../../${uri}`));

export const resolveFont = (uri: string) =>
  Array.from(fs.readFileSync(path.resolve(__dirname, `../../${uri}`)));

(global as any).fetch = jest.fn((uri: string) =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(resolveFile(uri)),
  })
);

export const testingFonts = {
  //  Noto: [resolveFont("skia/__tests__/assets/NotoSansSC-Regular.otf")],
  Roboto: [
    resolveFont("skia/__tests__/assets/Roboto-Regular.ttf"),
    resolveFont("skia/__tests__/assets/Roboto-BlackItalic.ttf"),
  ],
  //  NotoColorEmoji: [resolveFont("skia/__tests__/assets/NotoColorEmoji.ttf")],
};

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
  // requireNativeComponent: jest.fn,
  // TurboModuleRegistry: {
  //   getEnforcing: jest.fn,
  // },
}));
//jest.mock("react-native/Libraries/Utilities/codegenNativeComponent", jest.fn);

export const BirdGIF = resolveFile("skia/__tests__/assets/bird.gif").toString(
  "base64"
);

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
  return Skia.Font(tf!, ftSize ?? fontSize);
};

export const importSkia = (): typeof SkiaExports => {
  //const core = require("../../skia/core");
  const skia = require("../../skia");
  const renderer = require("../../renderer");
  const offscreen = require("../Offscreen");
  // TODO: to remove
  const animation = require("../../animation");
  return {
    ...skia,
    ...renderer,
    ...animation,
    ...offscreen,
  };
};

export const PIXEL_RATIO = 3;
export const fontSize = 32 * PIXEL_RATIO;
export const width = 256 * PIXEL_RATIO;
export const height = 256 * PIXEL_RATIO;
export const center = { x: width / 2, y: height / 2 };

export const drawOnNode = async (element: ReactNode) => {
  const { surface: ckSurface, draw, root } = await mountCanvas(element);
  await draw();
  root.unmount();
  return ckSurface;
};

export const mountCanvas = async (element: ReactNode) => {
  const Skia = global.SkiaApi;
  expect(Skia).toBeDefined();
  const ckSurface = Skia.Surface.MakeOffscreen(width, height)!;
  expect(ckSurface).toBeDefined();
  const canvas = ckSurface.getCanvas();

  const root = new SkiaSGRoot(Skia);
  return {
    surface: ckSurface,
    root,
    draw: async () => {
      await root.render(element);
      root.drawOnCanvas(canvas);
    },
  };
};

export const serialize = async (element: ReactNode) => {
  const { root } = await mountCanvas(element);
  const serialized = serializeNode(root.sg);
  return JSON.stringify(serialized);
};

interface SerializedProps {
  [key: string]: any;
}

interface SerializedNode {
  type: string;
  props: SerializedProps;
  children: SerializedNode[];
}

const serializeSkOjects = (obj: any): any => {
  if (typeof obj === "function") {
    return { __typename__: "Function", source: `${obj.toString()}` };
  } else if (obj instanceof Float32Array) {
    return { __typename__: "Float32Array", value: Array.from(obj) };
  } else if (Array.isArray(obj)) {
    return obj.map((item) => serializeSkOjects(item));
  } else if (obj && typeof obj === "object" && "__typename__" in obj) {
    if (obj instanceof SkiaObject) {
      const skObj: SkiaObject<EvalContext, any> = obj;
      return {
        __typename__: "SkiaObject",
        source: skObj.source,
        context: skObj.context,
      };
    } else if (obj.__typename__ === "Point") {
      return { __typename__: "Point", x: obj.x, y: obj.y };
    } else if (obj.__typename__ === "Paint") {
      return { __typename__: "Paint", color: Array.from(obj.getColor()) };
    } else if (obj.__typename__ === "Rect") {
      return {
        __typename__: "Rect",
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
      };
    } else if (obj.__typename__ === "RRect") {
      return {
        __typename__: "RRect",
        x: obj.rect.x,
        y: obj.rect.y,
        width: obj.rect.width,
        height: obj.rect.height,
        rx: obj.rx,
        ry: obj.ry,
      };
    } else if (isPath(obj)) {
      return {
        __typename__: "Path",
        cmds: obj.toCmds(),
      };
    } else if (obj.__typename__ === "Image") {
      const asset = assets.get(obj)!;
      if (!asset) {
        return {
          __typename__: "RawImage",
          data: obj.encodeToBase64(),
        };
      }
      return {
        __typename__: "Image",
        name: asset,
      };
    } else if (obj.__typename__ === "Font") {
      return {
        __typename__: "Font",
        size: obj.getSize(),
        name: assets.get(obj)!,
      };
    } else if (obj.__typename__ === "RuntimeEffect") {
      return {
        __typename__: "RuntimeEffect",
        source: obj.source(),
      };
    } else if (obj.__typename__ === "SVG") {
      return {
        __typename__: "SVG",
        source: obj.source(),
      };
    } else if (obj.__typename__ === "RSXform") {
      return {
        __typename__: "RSXform",
        scos: obj.scos,
        ssin: obj.ssin,
        tx: obj.tx,
        ty: obj.ty,
      };
    }
  } else if (obj && typeof obj === "object") {
    const result = Object.keys(obj).reduce((acc, key) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      acc[key] = serializeSkOjects(obj[key]);
      return acc;
    }, {});
    return result;
  }
  return obj;
};

const serializeNode = (node: Node<any>): SerializedNode => {
  const props: any = {};
  const ogProps = node.props;
  if (ogProps) {
    Object.keys(ogProps)
      .filter((key) => key !== "children")
      .forEach((key) => {
        props[key] = serializeSkOjects(ogProps[key]);
      });
  }
  return {
    type: node.type,
    props,
    children: node.children.map((child) => serializeNode(child)),
  };
};

export type EvalContext = Record<string, any>;

interface TestingSurface {
  eval<Ctx extends EvalContext = EvalContext, R = any>(
    fn: (Skia: Skia, ctx: Ctx) => R,
    ctx?: Ctx
  ): Promise<R>;
  drawOffscreen<Ctx extends EvalContext, R>(
    fn: (Skia: Skia, canvas: SkCanvas, ctx: Ctx) => R,
    ctx?: Ctx
  ): Promise<SkImage>;
  draw(node: ReactNode): Promise<SkImage>;
  screen(name: string): Promise<SkImage>;
  width: number;
  height: number;
  fontSize: number;
  OS: TestOS;
  arch: "paper" | "fabric";
}

class LocalSurface implements TestingSurface {
  readonly width = 256;
  readonly height = 256;
  readonly fontSize = 32;
  readonly OS = "node";
  readonly arch = "paper";

  eval<Ctx extends EvalContext, R>(
    fn: (Skia: Skia, ctx: Ctx) => R,
    ctx?: Ctx
  ): Promise<R> {
    return Promise.resolve(fn(global.SkiaApi, ctx ?? ({} as any)));
  }

  drawOffscreen<Ctx extends EvalContext>(
    fn: (Skia: Skia, canvas: SkCanvas, ctx: Ctx) => void,
    ctx?: Ctx
  ): Promise<SkImage> {
    const ckSurface = global.SkiaApi.Surface.MakeOffscreen(
      this.width * PIXEL_RATIO,
      this.height * PIXEL_RATIO
    );
    if (!ckSurface) {
      throw new Error("Unable to create offscreen surface");
    }
    const canvas = ckSurface.getCanvas();
    canvas.save();
    canvas.scale(PIXEL_RATIO, PIXEL_RATIO);
    fn(global.SkiaApi, canvas, ctx ?? ({} as any));
    canvas.restore();
    ckSurface.flush();
    return Promise.resolve(ckSurface.makeImageSnapshot());
  }

  async draw(node: ReactNode): Promise<SkImage> {
    const { surface: ckSurface, draw } = await mountCanvas(
      <Group transform={[{ scale: PIXEL_RATIO }]}>{node}</Group>
    );
    await draw();
    return Promise.resolve(ckSurface.makeImageSnapshot());
  }

  screen(_name: string): Promise<SkImage> {
    throw new Error("screen() is not implemented on node");
  }
}

class RemoteSurface implements TestingSurface {
  readonly width = 256;
  readonly height = 256;
  readonly fontSize = 32;
  readonly OS = global.testOS;
  readonly arch = global.testArch;

  eval<Ctx extends EvalContext, R>(
    fn: (Skia: Skia, ctx: Ctx) => any,
    context?: Ctx
  ): Promise<R> {
    const ctx = this.prepareContext(context);
    const body = { code: fn.toString(), ctx };
    return this.handleImageResponse<R>(JSON.stringify(body), true);
  }

  async drawOffscreen<Ctx extends EvalContext>(
    fn: (Skia: Skia, canvas: SkCanvas, ctx: Ctx) => void,
    context?: Ctx
  ) {
    const ctx = this.prepareContext(context);
    const code = `(Skia, ctx, size, scale) => {
const surface = Skia.Surface.MakeOffscreen(size, size);
if (!surface) {
  throw new Error("Unable to create offscreen surface");
}
const canvas = surface.getCanvas();
canvas.save();
canvas.scale(scale, scale);
(${fn.toString()})(Skia, canvas, ctx);
canvas.restore();
surface.flush();
return surface.makeImageSnapshot().encodeToBase64();
}`;
    const body = { code, ctx };
    const base64 = await this.handleImageResponse<string>(
      JSON.stringify(body),
      true
    );
    const Skia = global.SkiaApi;
    const data = Skia.Data.fromBase64(base64);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (image === null) {
      throw new Error("Unable to decode image");
    }
    return image;
  }

  async draw(node: ReactNode) {
    return this.handleImageResponse(await serialize(node));
  }

  screen(screen: string) {
    return this.handleImageResponse(JSON.stringify({ screen }));
  }

  private get client() {
    if (global.testClient === null) {
      throw new Error("Client is not connected. Did you call init?");
    }
    return global.testClient!;
  }

  private prepareContext<Ctx extends EvalContext>(context?: Ctx): EvalContext {
    const ctx: EvalContext = {};
    if (context) {
      Object.keys(context).forEach((key) => {
        ctx[key] = serializeSkOjects(context[key]);
      });
    }
    return ctx;
  }

  private handleImageResponse<R = SkImage>(
    body: string,
    json?: boolean
  ): Promise<R> {
    return new Promise((resolve) => {
      this.client.once("message", (raw: Buffer) => {
        resolve(json ? JSON.parse(raw.toString()) : this.decodeImage(raw));
      });
      this.client.send(body);
    });
  }

  private decodeImage(raw: Buffer) {
    const Skia = global.SkiaApi;
    const data = Skia.Data.fromBytes(new Uint8Array(raw));
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (image === null) {
      throw new Error("Unable to decode image");
    }
    return image;
  }
}
