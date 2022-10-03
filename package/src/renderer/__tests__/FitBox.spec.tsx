import React from "react";

import { processResult } from "../../__tests__/setup";
import { Circle, FitBox, Rect } from "../components";

import { drawOnNode, width, height, importSkia } from "./setup";

describe("FitBox", () => {
  it("Should scale the rectangle in half", () => {
    const { Skia } = importSkia();
    const surface = drawOnNode(
      <FitBox
        src={Skia.XYWHRect(0, 0, width, height)}
        dst={Skia.XYWHRect(width / 4, height / 4, width / 2, height / 2)}
      >
        <Rect x={0} y={0} width={width} height={height} color="lightblue" />
      </FitBox>
    );
    processResult(surface, "snapshots/drawings/lightblue-rect.png");
  });
  it("Should take the bottom right quarter of the circle and scale to the full canvas", () => {
    const { Skia } = importSkia();
    const surface = drawOnNode(
      <FitBox
        src={Skia.XYWHRect(width / 2, height / 2, width / 2, height / 2)}
        dst={Skia.XYWHRect(0, 0, width, height)}
      >
        <Circle
          r={width / 2}
          cx={width / 2}
          cy={height / 2}
          color="lightblue"
        />
      </FitBox>
    );
    processResult(surface, "snapshots/drawings/lightblue-quarter-circle.png");
  });
});
