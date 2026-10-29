import React from "react";

import {
  drawOnNode,
  PIXEL_RATIO,
  width,
  height,
  importSkia,
} from "../../setup";
import { Circle, Group, Paint } from "../../../components";
import { docPath, processResult } from "../../../../__tests__/setup";

const TestPaintAssignment = () => {
  const { Skia } = importSkia();
  const paint = Skia.Paint();
  paint.setColor(Skia.Color("lightblue"));
  const r = width / 2;
  return <Circle paint={paint} cx={r} cy={r} r={r} />;
};

describe("Paint", () => {
  it("should draw the color fill and strokes properly", async () => {
    const { vec } = importSkia();
    const strokeWidth = 10 * PIXEL_RATIO;
    const c = vec(width / 2, height / 2);
    const r = (width - strokeWidth) / 2;
    const surface = await drawOnNode(
      <>
        <Circle c={c} r={r} color="red">
          <Paint color="lightblue" />
          <Paint color="#adbce6" style="stroke" strokeWidth={strokeWidth} />
          <Paint color="#ade6d8" style="stroke" strokeWidth={strokeWidth / 2} />
        </Circle>
      </>
    );
    processResult(surface, docPath("paint/stroke.png"));
  });

  it("should use paint inheritance properly", async () => {
    const r = width / 6;
    const strokeWidth = 10 * PIXEL_RATIO;
    const surface = await drawOnNode(
      <Group color="lightblue">
        <Circle cx={r} cy={r} r={r} />
        <Group style="stroke" strokeWidth={strokeWidth}>
          <Circle cx={3 * r} cy={3 * r} r={r} />
        </Group>
      </Group>
    );
    processResult(surface, docPath("paint/inheritance.png"));
  });

  it("should use paint assignement properly", async () => {
    const surface = await drawOnNode(<TestPaintAssignment />);
    processResult(surface, docPath("paint/assignement.png"));
  });

  it("should use the opacity property properly", async () => {
    const { vec } = importSkia();
    const strokeWidth = 30 * PIXEL_RATIO;
    const r = width / 2 - strokeWidth / 2;
    const c = vec(width / 2, height / 2);
    const surface = await drawOnNode(
      <Group opacity={0.5}>
        <Circle c={c} r={r} color="red" />
        <Circle
          c={c}
          r={r}
          color="lightblue"
          style="stroke"
          strokeWidth={strokeWidth}
        />
        <Circle
          c={c}
          r={r}
          color="mint"
          style="stroke"
          strokeWidth={strokeWidth / 2}
        />
      </Group>
    );
    processResult(surface, docPath("paint/opacity.png"));
  });
});
