import React from "react";

import { processResult } from "../../__tests__/setup";
import { Path } from "../components";

import { drawOnNode, width, importSkia } from "./setup";

const size = width;

describe("Path Examples", () => {
  it("Should draw an arc", async () => {
    const { Skia } = importSkia();
    const arcRect = {
      x: 0,
      y: 0,
      width: size,
      height: size,
    };
    const path = Skia.PathBuilder.Make().addArc(arcRect, 45, 270).build();
    const surface = await drawOnNode(<Path path={path} color="lightblue" />);
    processResult(surface, "snapshots/paths/arc.png");
  });

  it("Should draw an oval", async () => {
    const { Skia } = importSkia();
    const rct = {
      x: 0,
      y: 0,
      width: size,
      height: size,
    };
    const path = Skia.Path.Oval(rct);
    const surface = await drawOnNode(<Path path={path} color="lightblue" />);
    processResult(surface, "snapshots/paths/oval.png");
  });

  it("Should draw an rounded rectangle", async () => {
    const { Skia } = importSkia();
    const path = Skia.Path.RRect({
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
    const r = size / 4;
    const path = Skia.Path.Polygon(
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
