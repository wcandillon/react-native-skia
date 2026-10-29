import React from "react";

import { surface } from "../setup";
import { Fill } from "../../components";
import { checkImage } from "../../../__tests__/setup";
import { LinearGradient } from "../../components/shaders/LinearGradient";

describe("Gradient", () => {
  it("should display a simple linear gradient", async () => {
    const vec = (x: number, y: number) => ({ x, y });
    const colors = ["#61dafb", "#fb61da", "#61fbcf", "#dafb61"];
    const { width, height } = surface;
    const start = vec(0, 0);
    const end = vec(width, height);

    const img = await surface.draw(
      <Fill>
        <LinearGradient colors={colors} start={start} end={end} />
      </Fill>
    );
    checkImage(img, "snapshots/gradient/linear.png");
  });
  it("should display a simple linear gradient with opacity", async () => {
    const vec = (x: number, y: number) => ({ x, y });
    const colors = ["#61dafb", "#fb61da", "#61fbcf", "#dafb61"];
    const { width, height } = surface;
    const start = vec(0, 0);
    const end = vec(width, height);

    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Fill opacity={0.5}>
          <LinearGradient colors={colors} start={start} end={end} />
        </Fill>
      </>
    );
    checkImage(img, "snapshots/gradient/linear-with-opacity.png");
  });
});
