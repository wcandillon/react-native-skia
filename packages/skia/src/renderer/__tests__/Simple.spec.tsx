import React from "react";

import { processResult } from "../../__tests__/setup";
import { Group, Line, Points, Rect } from "../components";
import * as SkiaRenderer from "../index";

import { center, drawOnNode, width, importSkia } from "./setup";

const size = width / 2;

describe("Renderer", () => {
  it("Loads renderer without Skia", () => {
    expect(SkiaRenderer).toBeDefined();
  });
  it("Light blue rectangle", async () => {
    const surface = await drawOnNode(
      <Rect
        x={(width - size) / 2}
        y={(width - size) / 2}
        width={size}
        height={size}
        color="lightblue"
      />
    );
    processResult(surface, "snapshots/drawings/lightblue-rect.png");
  });
  it("Scaled light blue rectangle", async () => {
    const scale = 2;
    const scaled = size / scale;
    const surface = await drawOnNode(
      <Group transform={[{ scale }]} origin={center}>
        <Rect
          x={(width - scaled) / 2}
          y={(width - scaled) / 2}
          width={scaled}
          height={scaled}
          color="lightblue"
        />
      </Group>
    );
    processResult(surface, "snapshots/drawings/lightblue-rect.png");
  });
  it("Points", async () => {
    const { vec } = importSkia();
    const c = { x: width / 2, y: size / 2 + 16 };
    const S = 25;
    const c1 = [
      vec(c.x - 2 * S, c.y - S),
      vec(c.x - S, c.y - 2 * S),
      vec(c.x - S, c.y - S),
    ];

    const c2 = [
      vec(c.x, c.y - 2 * S),
      vec(c.x + S, c.y),
      vec(c.x + S, c.y - S),
    ];

    const c3 = [
      vec(c.x - 10, c.y + 10),
      vec(c.x + S, c.y),
      vec(c.x + S, c.y + S),
    ];

    const c4 = [
      vec(c.x - 2 * S, c.y + S),
      vec(c.x - S, c.y + 2 * S),
      vec(c.x - S, c.y + S),
    ];

    const cubics = [...c1, ...c2, ...c3, ...c4];
    const surface = await drawOnNode(
      <Group color="#61DAFB" style="stroke" strokeWidth={3}>
        <Points mode="polygon" points={cubics} />
        <Line p1={c} p2={vec(size, 0)} />
        <Points mode="points" points={cubics} color="red" />
      </Group>
    );
    processResult(surface, "snapshots/drawings/points.png");
  });
});
