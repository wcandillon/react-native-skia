import React from "react";

import { checkImage } from "../../../__tests__/setup";
import { Fill, Points } from "../../components";
import { surface, importSkia } from "../setup";

describe("Points", () => {
  it("should draw a point without throwing an error", async () => {
    const { vec } = importSkia();
    const img = await surface.draw(
      <>
        <Fill color="#add8e6" />
        <Points
          points={[vec(-1, -1), { x: 0, y: 0 }, vec(1, 1)]}
          style="stroke"
          strokeWidth={4}
        />
      </>
    );
    checkImage(img, "snapshots/points/points.png");
  });
  it("should draw points with fill", async () => {
    const { vec } = importSkia();
    const img = await surface.draw(
      <>
        <Fill color="#add8e6" />
        <Points
          points={[{ x: 0, y: 0 }, vec(100, 100), vec(100, 200)]}
          strokeWidth={4}
        />
      </>
    );
    checkImage(img, "snapshots/points/points2.png");
  });
});
