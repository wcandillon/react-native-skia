import {
  importSkia,
  width,
  height,
  getSkDOM,
} from "../../renderer/__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
import { processResult } from "../../__tests__/setup";
import type { NodeType } from "../types";
import type { CircleProps } from "../types/Drawings";

describe("Drawings", () => {
  it("Hello World", () => {
    // If there is a mismatch between the NodeType values and the intrasic element names,
    // an static error will be thrown here.
    const foo: JSX.IntrinsicElements[`${NodeType}`] = {};
    expect(foo).toBeDefined();
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, vec } = importSkia();
    const Sk = getSkDOM();
    const c = vec(width / 2, height / 2);
    const c1 = Skia.Color("#61bea2");
    const c2 = Skia.Color("#529ca0");
    const R = width / 4;
    //const color = Skia.Color("rgb(36,43,56)");
    const root = Sk.Group({});

    const circle = Sk.Circle({ c, r: R, color: c1 });
    root.addChild(circle);
    let ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, "snapshots/render-nodes/simple.png");

    // These cast won't be necessary once we clean up types such as CircleDef
    circle.setProp("c" as keyof CircleProps, undefined);
    circle.setProp("cx" as keyof CircleProps, 0);
    circle.setProp("cy" as keyof CircleProps, 0);
    circle.setProp("color", c2);
    ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, "snapshots/render-nodes/simple2.png");
  });
});
