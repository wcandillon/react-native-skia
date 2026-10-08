import React from "react";

import { Circle, Group } from "../components";
import { processResult } from "../../__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
import { AlphaType, ColorType } from "../../skia/types";

import { drawOnNode } from "./setup";

describe("Surface", () => {
  it("asImage() draws the content of the surface", () => {
    const { Skia } = setupSkia();
    const source = Skia.Surface.MakeOffscreen(2, 2)!;
    source.getCanvas().drawColor(Skia.Color("cyan"));
    source.flush();
    const image = source.asImage();
    const target = Skia.Surface.MakeOffscreen(2, 2)!;
    target.getCanvas().drawImage(image, 0, 0);
    target.flush();
    const pixels = target.makeImageSnapshot().readPixels(0, 0, {
      width: 1,
      height: 1,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    expect(Array.from(pixels!)).toEqual([0, 255, 255, 255]);
  });
  it("MakeNonImageTexture on a CPU surface shouldn't leak", () => {
    const { Skia } = setupSkia();
    // When leaking, the WASM memory limit will be reached quite quickly
    // causing the test to fail
    for (let i = 0; i < 500; i++) {
      using surface = Skia.Surface.Make(1920, 1080)!;
      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color("cyan"));
      surface.flush();
      using image = surface.makeImageSnapshot();
      using copy = image.makeNonTextureImage();
      expect(copy).toBeDefined();
    }
  });
  it("A raster surface shouldn't leak (1)", () => {
    const { Skia } = setupSkia();
    // When leaking, the WASM memory limit will be reached quite quickly
    // causing the test to fail
    for (let i = 0; i < 500; i++) {
      using surface = Skia.Surface.Make(1920, 1080)!;
      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color("cyan"));
      surface.flush();
      using image = surface.makeImageSnapshot();
      expect(image).toBeDefined();
    }
  });
  it("A raster surface shouldn't leak (2)", () => {
    const { Skia } = setupSkia();
    // When leaking, the WASM memory limit will be reached quite quickly
    // causing the test to fail
    for (let i = 0; i < 500; i++) {
      using surface = Skia.Surface.MakeOffscreen(1920, 1080)!;
      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color("cyan"));
      surface.flush();
      using image = surface.makeImageSnapshot();
      expect(image).toBeDefined();
    }
  });
  it("A raster surface shouldn't leak (3)", async () => {
    for (let i = 0; i < 10; i++) {
      //const t = performance.now();
      const r = 128;
      using surface = await drawOnNode(
        <>
          <Group blendMode="multiply">
            <Circle cx={r} cy={r} r={r} color="cyan" />
            <Circle cx={r} cy={r} r={r} color="magenta" />
            <Circle cx={r} cy={r} r={r} color="yellow" />
          </Group>
        </>
      );
      surface.flush();
      //console.log(`Iteration ${i} took ${Math.floor(performance.now() - t)}ms`);
      processResult(surface, "snapshots/leak.png");
    }
  });
});
