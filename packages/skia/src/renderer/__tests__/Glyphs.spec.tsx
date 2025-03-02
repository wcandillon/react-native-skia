import fs from "fs";
import path from "path";

import React from "react";

import type { SkFont } from "../../skia/types";
import { processResult } from "../../__tests__/setup";
import { Glyphs } from "../components";

import { drawOnNode, importSkia } from "./setup";

let font: SkFont;
const fontSize = 64;

describe("Glyphs", () => {
  beforeAll(() => {
    const { Skia } = importSkia();
    const data = Skia.Data.fromBytes(
      fs.readFileSync(
        path.resolve(__dirname, "../../skia/__tests__/assets/Roboto-Medium.ttf")
      )
    );
    const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
    expect(tf !== null).toBe(true);
    font = Skia.Font(tf!, 64);
    expect(font !== null).toBe(true);
  });
  it("Should draw glyphs in lightblue", async () => {
    const { Skia } = importSkia();
    const ids = font.getGlyphIDs("ab");
    const glyphs = [
      { id: ids[0], pos: Skia.Point(0, fontSize) },
      {
        id: ids[1],
        pos: Skia.Point(
          font.getGlyphWidths([ids[0]]).reduce((a, b) => a + b),
          fontSize
        ),
      },
    ];
    const surface = await drawOnNode(
      <Glyphs x={0} y={0} font={font} glyphs={glyphs} color="lightblue" />
    );
    processResult(surface, "snapshots/glyphs/simple.png");
  });
});
