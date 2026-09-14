import React from "react";

import { checkImage } from "../../../__tests__/setup";
import { Fill, Path } from "../../components";
import { surface } from "../setup";

// The stroke prop replaces the path with the outline of the stroke, so the
// trim has to run first - otherwise start/end walk that outline's perimeter
// and end up painting a different part of the line.

const LINE = "M 20 128 L 236 128";

describe("Path trim", () => {
  it("trims the path before turning it into a stroke outline", async () => {
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Path
          path={LINE}
          color="red"
          stroke={{ width: 20 }}
          start={0}
          end={0.5}
        />
      </>
    );
    checkImage(image, "snapshots/drawings/path-trim-stroke.png");
  });

  it("leaves an untrimmed stroke alone", async () => {
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Path
          path={LINE}
          color="red"
          stroke={{ width: 20 }}
          start={0}
          end={1}
        />
      </>
    );
    checkImage(image, "snapshots/drawings/path-trim-stroke-full.png");
  });
});
