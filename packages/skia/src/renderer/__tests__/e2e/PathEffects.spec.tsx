import React from "react";

import type { Skia } from "../../../skia/types";
import { checkImage, itRunsE2eOnly } from "../../../__tests__/setup";
import {
  DiscretePathEffect,
  Fill,
  Path,
  SumPathEffect,
} from "../../components";
import { surface, importSkia } from "../setup";

const star = (Skia: Skia) => {
  const R = 115.2;
  const C = 128.0;
  let builder = Skia.PathBuilder.Make().moveTo(C + R, C);
  for (let i = 1; i < 8; ++i) {
    const a = 2.6927937 * i;
    builder = builder.lineTo(C + R * Math.cos(a), C + R * Math.sin(a));
  }
  return builder.build();
};

describe("Path Effects", () => {
  // Everything noise related, we don't want to run on a CPU backend
  itRunsE2eOnly("should apply the discrete path effect nicely", async () => {
    const { Skia } = importSkia();
    const path = star(Skia);
    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Path path={path} style="stroke" strokeWidth={2} color="lightblue">
          <DiscretePathEffect length={10} deviation={4} seed={0} />
        </Path>
      </>
    );
    checkImage(img, "snapshots/path-effects/discrete.png");
  });
  itRunsE2eOnly("should sum two path effects", async () => {
    const { Skia } = importSkia();
    const path = star(Skia);
    let img = await surface.draw(
      <>
        <Fill color="white" />
        <Path path={path} style="stroke" strokeWidth={2} color="lightblue">
          <SumPathEffect>
            <DiscretePathEffect length={10} deviation={4} seed={0} />
            <DiscretePathEffect length={10} deviation={4} seed={12345} />
          </SumPathEffect>
        </Path>
      </>
    );
    checkImage(img, "snapshots/path-effects/discrete.png", {
      shouldFail: true,
    });
    checkImage(img, "snapshots/path-effects/sum.png");
    img = await surface.draw(
      <>
        <Fill color="white" />
        <Path path={path} style="stroke" strokeWidth={2} color="lightblue">
          <SumPathEffect>
            <DiscretePathEffect length={10} deviation={4} seed={0} />
            <DiscretePathEffect length={10} deviation={4} seed={12345} />
            <DiscretePathEffect length={10} deviation={4} seed={123456789} />
          </SumPathEffect>
        </Path>
      </>
    );
    checkImage(img, "snapshots/path-effects/sum.png", { shouldFail: true });
    checkImage(img, "snapshots/path-effects/sum2.png");
  });
});
