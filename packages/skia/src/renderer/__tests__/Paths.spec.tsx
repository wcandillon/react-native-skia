import React from "react";

import { processResult } from "../../__tests__/setup";
import { Path } from "../components";

import { drawOnNode, width, importSkia } from "./setup";

const size = width;

describe("Path Examples", () => {
  it("Should draw an arc", async () => {
    const { Skia } = importSkia();
    const path = Skia.Path.Make();
    const arcRect = {
      x: 0,
      y: 0,
      width: size,
      height: size,
    };
    path.addArc(arcRect, 45, 270);
    const surface = await drawOnNode(<Path path={path} color="lightblue" />);
    processResult(surface, "snapshots/paths/arc.png");
  });

  it("Should draw an oval", async () => {
    const { Skia } = importSkia();
    const path = Skia.Path.Make();
    const rct = {
      x: 0,
      y: 0,
      width: size,
      height: size,
    };
    path.addOval(rct);
    const surface = await drawOnNode(<Path path={path} color="lightblue" />);
    processResult(surface, "snapshots/paths/oval.png");
  });

  it("Should draw an rounded rectangle", async () => {
    const { Skia } = importSkia();
    const path = Skia.Path.Make();
    path.addRRect({
      rect: {
        x: 0,
        y: 0,
        width: size,
        height: size,
      },
      rx: size / 4,
      ry: size / 4,
    });
    const surface = await drawOnNode(<Path path={path} color="lightblue" />);
    processResult(surface, "snapshots/paths/rrect.png");
  });

  it("Should draw a polygon", async () => {
    const { Skia, vec } = importSkia();
    const path = Skia.Path.Make();
    const r = size / 4;
    path.addPoly(
      [
        vec(r, r),
        { x: size - r, y: r },
        vec(size - r, size - r),
        { x: r, y: size - r },
      ],
      true
    );

    const surface = await drawOnNode(
      <Path path={path} strokeWidth={4} style="stroke" color="lightblue" />
    );
    processResult(surface, "snapshots/paths/poly.png");
  });
});
