import type { CanvasRef } from "../Canvas";

type Callable = (...args: never[]) => unknown;

describe("CanvasRef", () => {
  it("is the canvas's handle of methods, not a component", () => {
    const handleIsCallable: CanvasRef extends Callable ? true : false = false;
    expect(handleIsCallable).toBe(false);
  });
});
