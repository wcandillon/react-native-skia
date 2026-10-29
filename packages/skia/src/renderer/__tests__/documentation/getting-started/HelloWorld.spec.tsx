import React from "react";

import { BlendMode } from "../../../../skia/types";
import { setupSkia } from "../../../../skia/__tests__/setup";
import { docPath, processResult } from "../../../../__tests__/setup";
import { Circle, Group } from "../../../components";
import { drawOnNode, width, height, importSkia } from "../../setup";

const size = width;
const r = size * 0.33;

describe("Getting Started / Hello World", () => {
  it("Hello world with the imperative API", () => {
    const { Skia } = importSkia();
    const { surface, canvas } = setupSkia(width, height);

    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setBlendMode(BlendMode.Multiply);

    const cyan = paint.copy();
    cyan.setColor(Skia.Color("cyan"));
    canvas.drawCircle(r, r, r, cyan);
    // Magenta Circle
    const magenta = paint.copy();
    magenta.setColor(Skia.Color("magenta"));
    canvas.drawCircle(size - r, r, r, magenta);
    // Yellow Circle
    const yellow = paint.copy();
    yellow.setColor(Skia.Color("yellow"));
    canvas.drawCircle(size / 2, size - r, r, yellow);

    processResult(
      surface,
      docPath("getting-started/hello-world/blend-modes.png")
    );
  });
  it("Hello world with the declarative API", async () => {
    const surface = await drawOnNode(
      <Group blendMode="multiply">
        <Circle cx={r} cy={r} r={r} color="cyan" />
        <Circle cx={size - r} cy={r} r={r} color="magenta" />
        <Circle cx={size / 2} cy={size - r} r={r} color="yellow" />
      </Group>
    );
    processResult(
      surface,
      docPath("getting-started/hello-world/blend-modes.png")
    );
  });
});
