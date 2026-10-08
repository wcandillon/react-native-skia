import React from "react";

import { checkImage } from "../../../__tests__/setup";
import { Vertices } from "../../components";
import { surface, importSkia } from "../setup";

describe("Vertices", () => {
  it("should draw a single triangle", async () => {
    const { vec } = importSkia();
    const vertices = [vec(64, 0), vec(128, 256), vec(0, 256)];
    const colors = ["#61dafb", "#fb61da", "#dafb61"];
    const img = await surface.draw(
      <>
        <Vertices vertices={vertices} colors={colors} />
      </>
    );
    checkImage(img, "snapshots/vertices/vertices.png");
  });
  it("should draw a single triangle from a Float32Array", async () => {
    // Interleaved x, y pairs
    const vertices = new Float32Array([64, 0, 128, 256, 0, 256]);
    const colors = ["#61dafb", "#fb61da", "#dafb61"];
    const img = await surface.draw(
      <>
        <Vertices vertices={vertices} colors={colors} />
      </>
    );
    checkImage(img, "snapshots/vertices/vertices.png");
  });
  it("should draw a single triangle strip", async () => {
    const { vec } = importSkia();
    const vertices = [vec(0, 0), vec(128, 0), vec(0, 256), vec(128, 256)];
    const colors = ["#61dafb", "#fb61da", "#dafb61", "cyan"];
    const img = await surface.draw(
      <>
        <Vertices vertices={vertices} colors={colors} mode="triangleStrip" />
      </>
    );
    checkImage(img, "snapshots/vertices/strip.png");
  });
});
