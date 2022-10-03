import React from "react";

import { docPath, processResult } from "../../../__tests__/setup";
import { Group, Mask, Circle, Rect } from "../../components";
import { drawOnNode, width } from "../setup";

describe("Mask Documentation Examples", () => {
  it("Should draw an alpha mask", () => {
    const r = width / 2;
    const surface = drawOnNode(
      <>
        <Mask
          mask={
            <Group>
              <Circle cx={r} cy={r} r={r} opacity={0.5} />
              <Circle cx={r} cy={r} r={r / 2} />
            </Group>
          }
        >
          <Rect x={0} y={0} width={r * 2} height={r * 2} color="lightblue" />
        </Mask>
      </>
    );
    processResult(surface, docPath("mask/alpha-mask.png"));
  });
  it("Should draw an luminance mask", () => {
    const r = width / 2;
    const surface = drawOnNode(
      <>
        <Mask
          mode="luminance"
          mask={
            <Group>
              <Circle cx={r} cy={r} r={r} color="white" />
              <Circle cx={r} cy={r} r={r / 2} color="black" />
            </Group>
          }
        >
          <Rect x={0} y={0} width={r * 2} height={r * 2} color="lightblue" />
        </Mask>
      </>
    );
    processResult(surface, docPath("mask/luminance-mask.png"));
  });
});
