import React from "react";

import { importSkia, surface } from "../setup";
import { checkImage } from "../../../__tests__/setup";
import { Circle, Fill, Group, RoundedRect } from "../../components";

describe("Transform", () => {
  it("Should render a transform with the correct origin", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const r = width * 0.33;
    const image = await surface.draw(
      <Group
        blendMode="multiply"
        transform={[{ rotate: Math.PI }]}
        origin={Skia.Point(width / 2, height / 2)}
      >
        <Circle cx={r} cy={r} r={r} color="cyan" />
        <Circle cx={width - r} cy={r} r={r} color="magenta" />
        <Circle cx={width / 2} cy={height - r} r={r} color="yellow" />
      </Group>
    );
    checkImage(image, "snapshots/drawings/transform-origin.png");
  });

  it("Should use radians for the skewX transformation", async () => {
    const { Skia } = importSkia();
    const { width } = surface;
    const r = width / 4;
    const image = await surface.draw(
      <>
        <Fill color="#e8f4f8" />
        <Group
          color="lightblue"
          origin={Skia.Point(r, r)}
          transform={[{ skewX: Math.PI / 6 }]}
        >
          <RoundedRect x={r} y={r} width={2 * r} height={2 * r} r={10} />
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/skew-transform.png");
  });

  it("Should use radians for the skewY transformation", async () => {
    const { Skia } = importSkia();
    const { width } = surface;
    const r = width / 4;
    const image = await surface.draw(
      <>
        <Fill color="#e8f4f8" />
        <Group
          color="lightblue"
          origin={Skia.Point(r, r)}
          transform={[{ skewY: Math.PI / 6 }]}
        >
          <RoundedRect x={r} y={r} width={2 * r} height={2 * r} r={10} />
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/skew-transform2.png");
  });
});
