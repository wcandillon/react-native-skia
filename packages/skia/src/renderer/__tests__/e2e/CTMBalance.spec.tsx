import React from "react";

import { checkImage } from "../../../__tests__/setup";
import { Fill, Group, Rect } from "../../components";
import { surface } from "../setup";

// A CTM that saves nothing must not emit a restore, otherwise it pops the save
// of an enclosing group and every later sibling loses that group's transform.
// Each case wraps a sibling in a group whose only CTM prop is inert: the scene
// has to come out identical to the reference, where that group has no props.

const SHIFT = 128;
const REF = "snapshots/drawings/ctm-balance.png";

const drawScene = (inert: Record<string, unknown>) =>
  surface.draw(
    <>
      <Fill color="white" />
      <Group transform={[{ translateX: SHIFT }]}>
        <Group {...inert}>
          <Rect x={0} y={0} width={64} height={64} color="red" />
        </Group>
        <Rect x={0} y={64} width={64} height={64} color="blue" />
      </Group>
    </>
  );

describe("CTM save/restore balance", () => {
  it("Build reference result", async () => {
    checkImage(await drawScene({}), REF);
  });

  it("origin without transform or matrix", async () => {
    checkImage(await drawScene({ origin: { x: 0, y: 0 } }), REF);
  });

  it("clip resolved to false by a conditional", async () => {
    checkImage(await drawScene({ clip: false }), REF);
  });

  it("invertClip without a clip", async () => {
    checkImage(await drawScene({ invertClip: false }), REF);
  });

  it("still restores for a CTM that does save", async () => {
    // The inner group's own translate applies to the red rect only, and is
    // restored before the blue sibling is drawn.
    const image = await drawScene({ transform: [{ translateX: 32 }] });
    checkImage(image, "snapshots/drawings/ctm-balance-nested.png");
  });
});
