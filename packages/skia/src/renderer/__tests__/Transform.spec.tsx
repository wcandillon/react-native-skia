import React from "react";

import { processResult } from "../../__tests__/setup";
import { Group, Rect } from "../components";
import * as SkiaRenderer from "../index";

import { drawOnNode, width, importSkia } from "./setup";

describe("Renderer", () => {
  it("Loads renderer without Skia", () => {
    expect(SkiaRenderer).toBeDefined();
  });
  it("Scale with origin", async () => {
    const { Skia } = importSkia();
    const size = width;
    const origin = Skia.Point(size / 2, size / 2);
    const surface = await drawOnNode(
      <Group transform={[{ scale: 0.5 }]} origin={origin}>
        <Rect x={0} y={0} width={size} height={size} color="lightblue" />
      </Group>
    );
    processResult(surface, "snapshots/transform/scale-origin.png");
  });
  it("Scale with origin using a matrix", async () => {
    const { Skia } = importSkia();
    const size = width;
    const matrix = Skia.Matrix();
    const origin = Skia.Point(size / 2, size / 2);
    matrix
      .translate(origin.x, origin.y)
      .scale(0.5)
      .translate(-origin.x, -origin.y);
    expect(matrix.get()).toStrictEqual([0.5, 0, 192, 0, 0.5, 192, 0, 0, 1]);
    const surface = await drawOnNode(
      <Group matrix={matrix}>
        <Rect x={0} y={0} width={size} height={size} color="lightblue" />
      </Group>
    );
    processResult(surface, "snapshots/transform/scale-origin.png");
  });
  it("Scale with matrix and origin", async () => {
    const { Skia } = importSkia();
    const size = width;
    const matrix = Skia.Matrix();
    const origin = Skia.Point(size / 2, size / 2);
    matrix.scale(0.5);
    const surface = await drawOnNode(
      <Group matrix={matrix} origin={origin}>
        <Rect x={0} y={0} width={size} height={size} color="lightblue" />
      </Group>
    );
    processResult(surface, "snapshots/transform/scale-origin.png");
  });
  it("Should rotate a rectangle to 180deg", async () => {
    const { Skia } = importSkia();
    const size = width;
    const origin = Skia.Point(size / 2, size / 2);
    const w = size / 4;
    const surface = await drawOnNode(
      <Group transform={[{ rotate: Math.PI }]} origin={origin}>
        <Rect
          x={origin.x - w / 2}
          y={0}
          width={w}
          height={size}
          color="lightblue"
        />
      </Group>
    );
    processResult(surface, "snapshots/transform/rotate-radiants.png");
  });
});
