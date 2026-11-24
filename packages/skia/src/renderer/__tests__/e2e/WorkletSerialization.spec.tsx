/* eslint-disable @typescript-eslint/no-explicit-any */
import { surface } from "../setup";

// Skia objects are plain JS objects with jsi::NativeState and a per-runtime
// prototype, which worklets cannot copy by itself. The custom serializer
// registered in SkiaWorkletSerialization.ts recognizes and boxes them through
// the __skiaWorkletHelpers HostObject (NativeObjectWorkletHelpers in
// cpp/jsi/BoxedNativeObject.h). These specs exercise that helper directly and
// through a real worklet runtime. They only run on device: CanvasKit has no
// helper, and the device harness hands the worklet helpers over in `ctx`.
describe("Worklet serialization", () => {
  it("claims Skia objects and nothing else", async () => {
    if (surface.OS === "node") {
      return;
    }
    const result = await surface.eval((Skia, ctx) => {
      const helpers = (globalThis as any).__skiaWorkletHelpers;
      const { workletSerialization } = ctx;
      if (!helpers || !workletSerialization) {
        return null;
      }
      const rect = Skia.XYWHRect(1, 2, 3, 4);
      const paint = Skia.Paint();
      // A JS object whose prototype carries Symbol.toStringTag the way Skia
      // prototypes do, but without native state: the shape of any tagged class
      // instance.
      const taggedProto = {};
      Object.defineProperty(taggedProto, Symbol.toStringTag, {
        value: "Rect",
      });
      const tagged = Object.create(taggedProto);
      // Inherits every Rect getter through the prototype chain but has no
      // native state of its own.
      const inheriting = Object.create(rect);
      let boxInheritingThrows = false;
      try {
        helpers.box(inheriting);
      } catch {
        boxInheritingThrows = true;
      }
      const boxed = helpers.box(rect);
      return {
        rect: helpers.isNativeObject(rect),
        paint: helpers.isNativeObject(paint),
        tagged: helpers.isNativeObject(tagged),
        inheriting: helpers.isNativeObject(inheriting),
        foreignNativeState: helpers.isNativeObject(
          workletSerialization.foreignNativeStateObject()
        ),
        plain: helpers.isNativeObject({}),
        primitives:
          helpers.isNativeObject(null) ||
          helpers.isNativeObject(undefined) ||
          helpers.isNativeObject(42) ||
          helpers.isNativeObject("Rect"),
        boxInheritingThrows,
        brand: boxed.__brand,
        unboxesToSameObject: boxed.unbox() === rect,
      };
    });
    if (result === null) {
      return;
    }
    expect(result).toEqual({
      rect: true,
      paint: true,
      tagged: false,
      inheriting: false,
      foreignNativeState: false,
      plain: false,
      primitives: false,
      boxInheritingThrows: true,
      brand: "Rect",
      unboxesToSameObject: true,
    });
  });

  it("round-trips a rect through a worklet runtime", async () => {
    if (surface.OS === "node") {
      return;
    }
    const result = await surface.eval((Skia, ctx) => {
      const { workletSerialization } = ctx;
      if (!workletSerialization) {
        return null;
      }
      return workletSerialization.roundTripRect(Skia.XYWHRect(1, 2, 3, 4));
    });
    if (result === null) {
      return;
    }
    expect(result).toEqual({
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      typename: "Rect",
      sameObjectBack: true,
    });
  });

  it("leaves an object inheriting from a Skia prototype to worklets", async () => {
    if (surface.OS === "node") {
      return;
    }
    const result = await surface.eval((Skia, ctx) => {
      const { workletSerialization } = ctx;
      if (!workletSerialization) {
        return null;
      }
      // Not a Skia object: the serializer must not claim it and then fail to
      // box it, which would make capturing the worklet throw.
      return workletSerialization.captureForeign(
        Object.create(Skia.XYWHRect(1, 2, 3, 4))
      );
    });
    if (result === null) {
      return;
    }
    expect(result.threw).toBe(false);
  });
});
