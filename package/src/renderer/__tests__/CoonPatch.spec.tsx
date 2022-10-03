import React from "react";

import { processResult } from "../../__tests__/setup";
import { Patch } from "../components";
import * as SkiaRenderer from "../index";

import { drawOnNode, width } from "./setup";

describe("CoonsPatch", () => {
  it("Renderer", () => {
    expect(SkiaRenderer).toBeDefined();
  });
  it("Simple Coons Patch", () => {
    const vec = (x: number, y: number) => ({ x, y });
    const colors = ["#61dafb", "#fb61da", "#61fbcf", "#dafb61"];
    const C = 64;
    const topLeft = { pos: vec(0, 0), c1: vec(0, C), c2: vec(C, 0) };
    const topRight = {
      pos: vec(width, 0),
      c1: vec(width, C),
      c2: vec(width + C, 0),
    };
    const bottomRight = {
      pos: vec(width, width),
      c1: vec(width, width - 2 * C),
      c2: vec(width - 2 * C, width),
    };
    const bottomLeft = {
      pos: vec(0, width),
      c1: vec(0, width - 2 * C),
      c2: vec(-2 * C, width),
    };
    const surface = drawOnNode(
      <Patch
        colors={colors}
        patch={[topLeft, topRight, bottomRight, bottomLeft]}
      />
    );
    processResult(surface, "snapshots/coons-patch/simple.png");
  });
});
