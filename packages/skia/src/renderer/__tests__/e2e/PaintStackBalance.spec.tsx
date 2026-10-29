import React from "react";

import { checkImage } from "../../../__tests__/setup";
import { Group, Paint, Rect } from "../../components";
import { importSkia, surface } from "../setup";

// Every SavePaint command must push exactly one frame onto the paint/opacity
// stack, because RestorePaint and RestorePaintDeclaration each pop exactly one.
// When that invariant breaks, the opacity of an enclosing <Group> is left on
// the stack and applied to every sibling drawn after it (issue #3355).
describe("Paint stack balance", () => {
  it("should not leak a group opacity through a paint prop", async () => {
    const { Skia } = importSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("red"));
    const image = await surface.draw(
      <>
        <Group opacity={0.5}>
          <Rect x={16} y={16} width={96} height={96} paint={paint} />
        </Group>
        <Rect x={144} y={16} width={96} height={96} color="red" />
        <Rect x={16} y={144} width={96} height={96} color="blue" />
      </>
    );
    checkImage(image, "snapshots/drawings/paint-prop-opacity-balance.png");
  });

  it("should not leak a group opacity through a paint declaration", async () => {
    const image = await surface.draw(
      <>
        <Group opacity={0.5}>
          <Rect x={16} y={16} width={96} height={96} color="red">
            <Paint color="red" />
          </Rect>
        </Group>
        <Rect x={144} y={16} width={96} height={96} color="red" />
        <Rect x={16} y={144} width={96} height={96} color="blue" />
      </>
    );
    checkImage(
      image,
      "snapshots/drawings/paint-declaration-opacity-balance.png"
    );
  });
});
