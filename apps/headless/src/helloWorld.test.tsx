import React from "react";
import { getSkiaExports, ColorType, Group, Circle, drawOffscreen } from "@shopify/react-native-skia/src/headless";
import { LoadSkiaWeb } from "@shopify/react-native-skia/src/web/LoadSkiaWeb";

describe("Test Skia", () => {
  beforeEach(async () => {
    await LoadSkiaWeb();
  });

  it("should properly load Skia", async () => {
    const { Skia } = getSkiaExports();
    expect(Skia).toBeDefined();
  });

  it("Simple test", async () => {
    const { Skia } = getSkiaExports();
    const width = 256;
	  const height = 256;
    const surface = Skia.Surface.MakeOffscreen(width, height)!;
    expect(surface).toBeDefined();
	  const size = 60;
	  const r = size * 0.33;

	  const image = drawOffscreen(
		  surface,
      <Group blendMode="multiply">
        <Circle cx={r} cy={r} r={r} color="cyan" />
        <Circle cx={size - r} cy={r} r={r} color="magenta" />
        <Circle cx={size / 2} cy={size - r} r={r} color="yellow" />
      </Group>,
	  );
	  expect(image).toBeDefined();
	  expect(image.encodeToBase64()).toBeDefined();
  });

  it("test that ColorType is properly exported", async () => {
    expect(CanvasKit.ColorType.Alpha_8.value).toBe(ColorType.Alpha_8);
    expect(CanvasKit.ColorType.RGB_565.value).toBe(ColorType.RGB_565);
    //expect(CanvasKit.ColorType.ARGB_4444.value).toBe(ColorType.ARGB_4444);
    expect(CanvasKit.ColorType.RGBA_8888.value).toBe(
      ColorType.RGBA_8888
    );
    //expect(CanvasKit.ColorType.RGB_888x.value).toBe(ColorType.RGB_888x);
    expect(CanvasKit.ColorType.BGRA_8888.value).toBe(
      ColorType.BGRA_8888
    );
    expect(CanvasKit.ColorType.RGBA_1010102.value).toBe(
      ColorType.RGBA_1010102
    );
    //expect(CanvasKit.ColorType.BGRA_1010102.value).toBe(ColorType.BGRA_1010102);
    expect(CanvasKit.ColorType.RGB_101010x.value).toBe(
      ColorType.RGB_101010x
    );
    //expect(CanvasKit.ColorType.BGR_101010x.value).toBe(ColorType.BGR_101010x);
    //expect(CanvasKit.ColorType.BGR_101010x_XR.value).toBe(ColorType.BGR_101010x_XR);
    //expect(CanvasKit.ColorType.BGRA_10101010_XR.value).toBe(ColorType.BGRA_10101010_XR);
    //expect(CanvasKit.ColorType.RGBA_10x6.value).toBe(ColorType.RGBA_10x6);
    expect(CanvasKit.ColorType.Gray_8.value).toBe(ColorType.Gray_8);
    //expect(CanvasKit.ColorType.RGBA_F16Norm.value).toBe(ColorType.RGBA_F16Norm);
    expect(CanvasKit.ColorType.RGBA_F16.value).toBe(
      ColorType.RGBA_F16
    );
    //expect(CanvasKit.ColorType.RGB_F16F16F16x.value).toBe(ColorType.RGB_F16F16F16x);
    expect(CanvasKit.ColorType.RGBA_F32.value).toBe(
      ColorType.RGBA_F32
    );
  });
});