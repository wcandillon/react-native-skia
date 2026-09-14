import React from "react";

import { BlurMask, Circle, Fill, Group } from "../../components";
import type { SkImage } from "../../../skia/types";
import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

// `respectCTM` decides whether the blur sigma is scaled by the current
// transformation matrix, so it is only observable under a scaled CTM - hence
// the <Group transform>. `<BlurMask />` defaults it to `true`, which is also
// Skia's own default for SkMaskFilter::MakeBlur.
const Scene = ({ respectCTM }: { respectCTM?: boolean }) => {
  const r = surface.width / 8;
  return (
    <>
      <Fill color="white" />
      <Group transform={[{ scale: 3 }]}>
        <Circle cx={r} cy={r} r={r} color="black">
          <BlurMask
            blur={4}
            {...(respectCTM === undefined ? {} : { respectCTM })}
          />
        </Circle>
      </Group>
    </>
  );
};

// Number of pixels the shape and its blur cover: a blur whose sigma follows the
// CTM reaches considerably further than one that ignores it.
const coveredArea = (image: SkImage) => {
  const width = image.width();
  const height = image.height();
  const pixels = image.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  })!;
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] < 250) {
      count++;
    }
  }
  return count;
};

describe("Mask filters", () => {
  it("BlurMask defaults respectCTM to true", async () => {
    const withDefault = coveredArea(await surface.draw(<Scene />));
    const respectingCTM = coveredArea(await surface.draw(<Scene respectCTM />));
    const ignoringCTM = coveredArea(
      await surface.draw(<Scene respectCTM={false} />)
    );
    // Sanity check: the two explicit values must actually differ, otherwise the
    // assertion below would hold for either default.
    expect(ignoringCTM).toBeLessThan(respectingCTM);
    expect(withDefault).toBe(respectingCTM);
  });
});
