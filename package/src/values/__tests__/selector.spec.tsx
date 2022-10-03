import React from "react";

import { Fill } from "../../renderer/components";
import { mountCanvas } from "../../renderer/__tests__/setup";
import { processResult } from "../../__tests__/setup";
import { Selector } from "../selector";

describe("Value Selector", () => {
  it("should accept a selector descriptor as a property with arrays", async () => {
    const value = global.SkiaValueApi.createValue(["red", "green"]);
    const { surface, draw } = mountCanvas(
      <Fill color={Selector(value, (v) => v[1])} />
    );
    draw();
    processResult(surface, "snapshots/animations/green.png");
  });

  it("should accept a selector descriptor as a property with objects", async () => {
    const value = global.SkiaValueApi.createValue({ color: "red" });
    const { surface, draw } = mountCanvas(
      <Fill color={Selector(value, (v) => v.color)} />
    );
    draw();
    processResult(surface, "snapshots/animations/red.png");
  });
});
