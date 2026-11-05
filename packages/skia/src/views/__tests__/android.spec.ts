import type { NativeProps } from "../../specs/SkiaViewNativeComponent";
import type { AndroidBackingView, AndroidCanvasProps } from "../types";
import type { AndroidNativeProps } from "../android";
import {
  androidNativeProps,
  resolveBackingView,
  resolveHighBitDepth,
} from "../android";

jest.mock("../../Platform", () => ({
  Platform: { OS: "android" },
}));

const { Platform } = jest.requireMock<{
  Platform: { OS: string };
}>("../../Platform");

beforeEach(() => {
  Platform.OS = "android";
});

// What a JavaScript caller can pass that TypeScript refuses.
const untyped = (android: object) => android as AndroidCanvasProps;

describe("AndroidCanvasProps", () => {
  // Without `backingView` the union cannot tell the views apart, so asking
  // another view for an option only a SurfaceView takes must not compile.
  it("takes each option on the views that honour it only", () => {
    const textureViewTakesZOrder: {
      opaque: false;
      zOrderOnTop: true;
    } extends AndroidCanvasProps
      ? true
      : false = false;
    const hardwareBufferViewTakesOpaque: {
      backingView: "HardwareBufferView";
      opaque: true;
    } extends AndroidCanvasProps
      ? true
      : false = false;
    const surfaceViewTakesZOrder: {
      backingView: "SurfaceView";
      opaque: false;
      zOrderOnTop: true;
    } extends AndroidCanvasProps
      ? true
      : false = true;
    expect([
      textureViewTakesZOrder,
      hardwareBufferViewTakesOpaque,
      surfaceViewTakesZOrder,
    ]).toEqual([false, false, true]);
  });

  // An option's default is what every view does without it.
  it("takes an option's default on every view", () => {
    const textureViewTakesDefaults: {
      opaque: true;
      zOrderOnTop: false;
      zOrderMediaOverlay: false;
    } extends AndroidCanvasProps
      ? true
      : false = true;
    const hardwareBufferViewTakesDefaults: {
      backingView: "HardwareBufferView";
      opaque: false;
      zOrderOnTop: false;
    } extends AndroidCanvasProps
      ? true
      : false = true;
    expect([textureViewTakesDefaults, hardwareBufferViewTakesDefaults]).toEqual(
      [true, true]
    );
  });

  // The published types restate the views rather than import the spec.
  it("names the views the native component's spec takes", () => {
    type SpecBackingView = NonNullable<NativeProps["androidBackingView"]>;
    const sameViews: [AndroidBackingView] extends [SpecBackingView]
      ? [SpecBackingView] extends [AndroidBackingView]
        ? true
        : false
      : false = true;
    expect(sameViews).toBe(true);
  });
});

describe("resolveBackingView", () => {
  it("names a TextureView by default", () => {
    expect(resolveBackingView()).toBe("TextureView");
    expect(resolveBackingView({ opaque: true })).toBe("TextureView");
  });

  it.each<AndroidBackingView>([
    "TextureView",
    "SurfaceView",
    "HardwareBufferView",
  ])("names %s", (backingView) => {
    expect(resolveBackingView(untyped({ backingView }))).toBe(backingView);
  });

  // The generated string-enum parser aborts on a value it does not know.
  it("gives a value no view takes the default view", () => {
    expect(resolveBackingView(untyped({ backingView: "SurfaceControl" }))).toBe(
      "TextureView"
    );
  });
});

describe("androidNativeProps", () => {
  it("backs a canvas with a TextureView of its own opacity by default", () => {
    expect(androidNativeProps(undefined)).toEqual({
      androidBackingView: "TextureView",
      androidOpacity: "Default",
      androidZOrderOnTop: false,
      androidZOrderMediaOverlay: false,
    });
  });

  // The native view resolves the default for the view it created, which a
  // later backingView does not change (see BackingViewKind.resolveOpaque).
  it.each<[AndroidCanvasProps, AndroidNativeProps["androidOpacity"]]>([
    [{}, "Default"],
    [{ opaque: true }, "Opaque"],
    [{ opaque: false }, "Translucent"],
    [{ backingView: "SurfaceView" }, "Default"],
    [{ backingView: "SurfaceView", opaque: false }, "Translucent"],
    [{ backingView: "HardwareBufferView", opaque: false }, "Translucent"],
  ])("hands the opacity %j asks for as %s", (android, opacity) => {
    expect(androidNativeProps(android).androidOpacity).toBe(opacity);
  });

  it("asks for the view's own opacity when opaque is no boolean", () => {
    expect(androidNativeProps(untyped({ opaque: null })).androidOpacity).toBe(
      "Default"
    );
  });

  // A SurfaceView takes them, and any other view warns about them.
  it("hands the z-order options to every view", () => {
    const zOrder = { zOrderOnTop: true, zOrderMediaOverlay: true };
    expect(
      androidNativeProps({ backingView: "SurfaceView", ...zOrder })
    ).toMatchObject({
      androidZOrderOnTop: true,
      androidZOrderMediaOverlay: true,
    });
    expect(androidNativeProps(untyped(zOrder))).toMatchObject({
      androidBackingView: "TextureView",
      androidZOrderOnTop: true,
      androidZOrderMediaOverlay: true,
    });
  });

  it("keeps the opacity asked of a value no view takes", () => {
    const android = untyped({ backingView: "SurfaceControl", opaque: true });
    expect(androidNativeProps(android)).toEqual({
      androidBackingView: "TextureView",
      androidOpacity: "Opaque",
      androidZOrderOnTop: false,
      androidZOrderMediaOverlay: false,
    });
  });

  it("is a pure function of its argument", () => {
    const android: AndroidCanvasProps = Object.freeze({
      backingView: "SurfaceView",
      opaque: false,
      zOrderMediaOverlay: true,
    });
    expect(androidNativeProps(android)).toEqual(androidNativeProps(android));
    expect(android).toEqual({
      backingView: "SurfaceView",
      opaque: false,
      zOrderMediaOverlay: true,
    });
  });
});

describe("resolveHighBitDepth", () => {
  it("gives the 10-bit format to a SurfaceView only, on Android", () => {
    expect(resolveHighBitDepth(true, "SurfaceView")).toBe(true);
    expect(resolveHighBitDepth(false, "SurfaceView")).toBe(false);
    expect(resolveHighBitDepth(true, "TextureView")).toBe(false);
    expect(resolveHighBitDepth(true, "HardwareBufferView")).toBe(false);
  });

  it("leaves the bit depth to the prop on the other platforms", () => {
    Platform.OS = "ios";
    expect(resolveHighBitDepth(true, "TextureView")).toBe(true);
    expect(resolveHighBitDepth(false, "TextureView")).toBe(false);
  });
});
