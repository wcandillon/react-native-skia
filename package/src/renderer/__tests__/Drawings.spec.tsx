import React from "react";

import { processResult } from "../../__tests__/setup";
import { Blur, Circle, Fill, Group, Paint, RoundedRect } from "../components";

import { drawOnNode, width, Skia, height } from "./setup";

describe("Test introductionary examples from our documentation", () => {
  it("Should blend colors using multiplication", () => {
    const r = width * 0.33;
    const surface = drawOnNode(
      <Group blendMode="multiply">
        <Circle cx={r} cy={r} r={r} color="cyan" />
        <Circle cx={width - r} cy={r} r={r} color="magenta" />
        <Circle cx={width / 2} cy={height - r} r={r} color="yellow" />
      </Group>
    );
    processResult(surface, "snapshots/drawings/blend-mode-multiply.png");
  });

  it("Should use a blur image filter", () => {
    const r = width * 0.33;
    const surface = drawOnNode(
      <Group blendMode="multiply">
        <Blur blur={30} />
        <Circle cx={r} cy={r} r={r} color="cyan" />
        <Circle cx={width - r} cy={r} r={r} color="magenta" />
        <Circle cx={width / 2} cy={height - r} r={r} color="yellow" />
      </Group>
    );
    processResult(surface, "snapshots/drawings/blur.png");
  });

  it("Should render a transform with the correct origin", () => {
    const r = width * 0.33;
    const surface = drawOnNode(
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
    processResult(surface, "snapshots/drawings/transform-origin.png");
  });

  it("Should use radians for the skew transformation", () => {
    const r = width / 4;
    const surface = drawOnNode(
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
    processResult(surface, "snapshots/drawings/skew-transform.png");
  });

  it("Should use multiple paint definitions for one drawing command", () => {
    const r = width / 4;
    const strokeWidth = 50;
    const surface = drawOnNode(
      <>
        <Circle cx={width / 2} cy={width / 2} r={r} color="red">
          <Paint color="lightblue" />
          <Paint color="#adbce6" style="stroke" strokeWidth={strokeWidth} />
          <Paint color="#ade6d8" style="stroke" strokeWidth={strokeWidth / 2} />
        </Circle>
      </>
    );
    processResult(surface, "snapshots/drawings/multiple-paints.png");
  });
});
