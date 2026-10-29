import React from "react";

import { processResult } from "../../__tests__/setup";
import { Fill } from "../components";
import * as SkiaRenderer from "../index";

import type { EmptyProps } from "./setup";
import { importSkia, mountCanvas, wait } from "./setup";

const CheckData = ({}: EmptyProps) => {
  const { useFont } = importSkia();
  const font = useFont(null);
  if (font === null) {
    return <Fill color="green" />;
  }
  return <Fill color="red" />;
};

const CheckFont = ({}: EmptyProps) => {
  const { useFont } = importSkia();
  const font = useFont("skia/__tests__/assets/Roboto-Medium.ttf");
  if (!font) {
    return <Fill color="red" />;
  }
  return <Fill color="green" />;
};

const CheckImage = ({}: EmptyProps) => {
  const { useImage } = importSkia();
  const image = useImage("skia/__tests__/assets/zurich.jpg");
  if (!image) {
    return <Fill color="red" />;
  }
  return <Fill color="green" />;
};

describe("Data Loading", () => {
  it("Loads renderer without Skia", async () => {
    expect(SkiaRenderer).toBeDefined();
  });
  it("Should accept null as an argument", async () => {
    const { surface, draw } = await mountCanvas(<CheckData />);
    await draw();
    processResult(surface, "snapshots/font/green.png");
    await draw();
    processResult(surface, "snapshots/font/green.png");
  });

  it("Should load a font file", async () => {
    const { surface, draw } = await mountCanvas(<CheckFont />);
    await draw();
    processResult(surface, "snapshots/font/red.png");
    await wait(1500);
    await draw();
    processResult(surface, "snapshots/font/green.png");
  });

  it("Should load an image", async () => {
    const { surface, draw } = await mountCanvas(<CheckImage />);
    await draw();
    processResult(surface, "snapshots/font/red.png");
    await wait(1500);
    await draw();
    processResult(surface, "snapshots/font/green.png");
  });
});
