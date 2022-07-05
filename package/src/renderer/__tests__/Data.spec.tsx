import path from "path";

import React from "react";

import { processResult } from "../../__tests__/setup";
import { Fill } from "../components";
import * as SkiaRenderer from "../index";
import type { SkData } from "../../skia/types/Data/Data";

import { mountCanvas, nodeRequire, Skia } from "./setup";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EmptyProps {}

const CheckFont = ({}: EmptyProps) => {
  const { useFont } = require("../../skia/core/Font");
  const font = useFont(
    nodeRequire(
      path.resolve(__dirname, "../../skia/__tests__/assets/Roboto-Medium.ttf")
    )
  );
  if (!font) {
    return <Fill color="red" />;
  }
  return <Fill color="green" />;
};

const CheckDataCollection = ({}: EmptyProps) => {
  const { useDataCollection } = require("../../skia/core/Data");
  const font = useDataCollection(
    [
      nodeRequire(
        path.resolve(__dirname, "../../skia/__tests__/assets/Roboto-Medium.ttf")
      ),
      nodeRequire(
        path.resolve(__dirname, "../../skia/__tests__/assets/Roboto-Medium.ttf")
      ),
    ],
    (data: SkData) => Skia.Typeface.MakeFreeTypeFaceFromData(data)
  );
  if (!font) {
    return <Fill color="red" />;
  }
  return <Fill color="green" />;
};

describe("Data Loading", () => {
  it("Loads renderer without Skia", async () => {
    expect(SkiaRenderer).toBeDefined();
  });
  it("Should load a font file", async () => {
    const { surface, draw } = mountCanvas(<CheckFont />);
    draw();
    processResult(surface, "snapshots/font/red.png");
    await wait(500);
    draw();
    processResult(surface, "snapshots/font/green.png");
  });

  it("Should load many font files", async () => {
    const { surface, draw } = mountCanvas(<CheckDataCollection />);
    draw();
    processResult(surface, "snapshots/font/red.png");
    await wait(500);
    draw();
    processResult(surface, "snapshots/font/green.png");
  });
});
