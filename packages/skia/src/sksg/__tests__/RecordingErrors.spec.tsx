import React, { act, useState } from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { Blend, Blur, Fill, Turbulence } from "../../renderer/components";
import { AlphaType, ColorType } from "../../skia/types";
import { SkiaSGRoot } from "../Reconciler";

// A <Blur> under a shader <Blend>: the recorder rejects it.
const BrokenShader = () => (
  <Fill>
    <Blend mode="multiply">
      <Turbulence freqX={0.05} freqY={0.05} octaves={4} />
      <Blur blur={4} />
    </Blend>
  </Fill>
);

let setBroken: (broken: boolean) => void = () => {};

// Only the state update goes through act(): the root awaits its own commits,
// and act() would wait for them before flushing the work they need.
const actEnvironment = (enabled: boolean) => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: enabled });
};

const Scene = () => {
  const [broken, set] = useState(true);
  setBroken = set;
  return broken ? <BrokenShader /> : <Fill color="cyan" />;
};

describe("Recording errors", () => {
  it("fails the frame, not the commit, and the next update still commits", async () => {
    const { Skia } = importSkia();
    const surface = Skia.Surface.MakeRaster(4, 4)!;
    const canvas = surface.getCanvas();
    const root = new SkiaSGRoot(Skia);
    // React swaps the committed tree in only after the recording: the commit
    // completes, and the error waits for the frame to be asked for.
    await root.render(<Scene />);
    expect(() => root.drawOnCanvas(canvas)).toThrow(/Invalid shader type/);
    // The root is consistent: the next update commits and records.
    actEnvironment(true);
    await act(() => setBroken(false));
    actEnvironment(false);
    root.drawOnCanvas(canvas);
    surface.flush();
    const pixels = surface.makeImageSnapshot().readPixels(0, 0, {
      width: 1,
      height: 1,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    expect(Array.from(pixels!)).toEqual([0, 255, 255, 255]);
    await root.unmount();
  });
});
