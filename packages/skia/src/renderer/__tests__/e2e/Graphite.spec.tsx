import React from "react";

import { surface, importSkia } from "../setup";
import { Circle } from "../../components";
import { checkImage } from "../../../__tests__/setup";

describe("Graphite", () => {
  it("should draw a cyan circle", async () => {
    const { Skia } = importSkia();
    const path = Skia.Path.Make();
    const r = 128;
    path.addCircle(r, r, r);
    const img = await surface.draw(<Circle color="cyan" cx={r} cy={r} r={r} />);
    checkImage(img, "snapshots/drawings/graphite/cyan-circle.png");
  });
  it("should draw a red circle", async () => {
    const { Skia } = importSkia();
    const path = Skia.Path.Make();
    const r = 128;
    path.addCircle(r, r, r);
    const img = await surface.draw(<Circle color="red" cx={r} cy={r} r={r} />);
    checkImage(img, "snapshots/drawings/graphite/red-circle.png");
  });
});
