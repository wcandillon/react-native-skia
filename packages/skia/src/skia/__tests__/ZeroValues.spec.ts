import fs from "fs";
import path from "path";

import { BlendMode, FontWeight, ImageFormat } from "../types";
import type { SkCanvas, Skia, SkSurface } from "../types";
import type { JsiSkCanvas } from "../web/JsiSkCanvas";
import { JsiSkTextStyle } from "../web/JsiSkTextStyle";

import { setupSkia } from "./setup";

// Every case in this file exercises a value of 0 that is a legitimate input
// (BlendMode.Clear, a JPEG quality of 0, FontWeight.Invisible, a zero stroke
// width, ...). The Web implementation used to test these with a truthiness
// check and silently treat them as "not provided".

const asset = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, "assets", name));

const rgbaAt = (canvasOwner: SkSurface, x = 0, y = 0) => {
  const image = canvasOwner.makeImageSnapshot();
  const pixels = image.readPixels() as Uint8Array;
  const i = (y * image.width() + x) * 4;
  return Array.from(pixels.slice(i, i + 4));
};

const makeGradientImage = (Skia: Skia, size = 64) => {
  const surface = Skia.Surface.Make(size, size)!;
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: size, y: size },
      [Skia.Color("red"), Skia.Color("green"), Skia.Color("blue")],
      null,
      0
    )
  );
  canvas.drawRect(Skia.XYWHRect(0, 0, size, size), paint);
  surface.flush();
  return surface.makeImageSnapshot();
};

const ckRef = (canvas: SkCanvas) => (canvas as JsiSkCanvas).ref;

describe("Zero is a valid value", () => {
  describe("Canvas", () => {
    it("drawColor honors BlendMode.Clear", () => {
      const { Skia, surface, canvas } = setupSkia(4, 4);
      canvas.drawColor(Skia.Color("red"));
      canvas.drawColor(Skia.Color("blue"), BlendMode.Clear);
      surface.flush();
      expect(rgbaAt(surface)).toEqual([0, 0, 0, 0]);
    });

    it("drawPatch forwards BlendMode.Clear", () => {
      const { Skia, canvas, CanvasKit } = setupSkia(4, 4);
      const spy = jest.spyOn(ckRef(canvas), "drawPatch");
      const cubics = Array.from({ length: 12 }, (_, i) => ({ x: i, y: i }));
      canvas.drawPatch(
        cubics,
        [
          Skia.Color("red"),
          Skia.Color("green"),
          Skia.Color("blue"),
          Skia.Color("white"),
        ],
        null,
        BlendMode.Clear,
        Skia.Paint()
      );
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][3]).toBe(CanvasKit.BlendMode.Clear);
      spy.mockRestore();
    });

    it("drawAtlas forwards BlendMode.Clear", () => {
      const { Skia, canvas, CanvasKit } = setupSkia(4, 4);
      const spy = jest.spyOn(ckRef(canvas), "drawAtlas");
      const image = makeGradientImage(Skia, 8);
      canvas.drawAtlas(
        image,
        [Skia.XYWHRect(0, 0, 8, 8)],
        [Skia.RSXform(1, 0, 0, 0)],
        Skia.Paint(),
        BlendMode.Clear,
        [Skia.Color("red")]
      );
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][4]).toBe(CanvasKit.BlendMode.Clear);
      spy.mockRestore();
    });
  });

  describe("Image", () => {
    it("encodeToBytes honors a quality of 0", () => {
      const { Skia } = setupSkia();
      const image = makeGradientImage(Skia);
      const lowest = image.encodeToBytes(ImageFormat.JPEG, 0);
      const highest = image.encodeToBytes(ImageFormat.JPEG, 100);
      // Quality 0 used to be dropped and fall back to the encoder default,
      // which produced the same bytes as quality 100.
      expect(lowest.byteLength).toBeLessThan(highest.byteLength);
    });
  });

  describe("TextStyle", () => {
    it("keeps FontWeight.Invisible", () => {
      const style = JsiSkTextStyle.toTextStyle({
        fontStyle: { weight: FontWeight.Invisible },
      });
      expect(style.fontStyle?.weight).toEqual({ value: FontWeight.Invisible });
    });

    it("keeps zero-valued enums", () => {
      const style = JsiSkTextStyle.toTextStyle({
        decorationStyle: 0,
        textBaseline: 0,
        fontStyle: { slant: 0, width: 1 },
      });
      expect(style.decorationStyle).toEqual({ value: 0 });
      expect(style.textBaseline).toEqual({ value: 0 });
      expect(style.fontStyle?.slant).toEqual({ value: 0 });
      expect(style.fontStyle?.width).toEqual({ value: 1 });
    });

    it("leaves unset fields undefined", () => {
      const style = JsiSkTextStyle.toTextStyle({ fontStyle: {} });
      expect(style.decorationStyle).toBeUndefined();
      expect(style.textBaseline).toBeUndefined();
      expect(style.fontStyle?.slant).toBeUndefined();
      expect(style.fontStyle?.weight).toBeUndefined();
      expect(style.fontStyle?.width).toBeUndefined();
    });
  });

  describe("Skottie", () => {
    it("getTextSlot reports zero-valued numeric fields", () => {
      const { Skia } = setupSkia();
      const json = fs.readFileSync(
        path.resolve(
          __dirname,
          "../../renderer/__tests__/e2e/setup/skottie/basic_slots.json"
        ),
        "utf8"
      );
      const animation = Skia.Skottie.Make(json, {
        "NotoSerif": Skia.Data.fromBytes(
          new Uint8Array(asset("NotoSansSC-Regular.otf"))
        ),
        "img_0.png": Skia.Data.fromBytes(new Uint8Array(asset("oslo.jpg"))),
      });
      const slot = animation.getTextSlot("TextSource");
      expect(slot).not.toBeNull();
      // The slot in this animation has no stroke and no line shift: both are
      // 0 and used to be omitted from the result.
      expect(slot!.strokeWidth).toBe(0);
      expect(slot!.lineShift).toBe(0);
      expect(slot!.textSize).toBeGreaterThan(0);
    });
  });
});
