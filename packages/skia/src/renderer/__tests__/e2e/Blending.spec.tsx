import React from "react";

import { importSkia, surface } from "../setup";
import { docPath, checkImage } from "../../../__tests__/setup";
import {
  Blend,
  ColorShader,
  Fill,
  Group,
  LinearGradient,
  RadialGradient,
} from "../../components";

describe("Test Blending", () => {
  it("should display a linear gradient", async () => {
    const { width, height } = surface;
    const image = await surface.draw(
      <Group>
        <LinearGradient
          colors={["cyan", "magenta", "yellow"]}
          start={{ x: 0, y: 0 }}
          end={{ x: width, y: height }}
        />
        <Fill />
      </Group>
    );
    checkImage(image, "snapshots/runtime-effects/linear-gradient.png");
  });

  it("should display a color", async () => {
    const image = await surface.draw(
      <Fill>
        <ColorShader color="lightblue" />
      </Fill>
    );
    checkImage(image, docPath("shaders/color.png"));
  });

  it("should blend cyan/magenta/yellow to black (multiply)", async () => {
    const { vec } = importSkia();
    const { width } = surface;
    const r = width / 2;
    const c = vec(r, r);
    const image = await surface.draw(
      <Fill>
        <Blend mode="multiply">
          <RadialGradient r={r} c={c} colors={["cyan", "magenta"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
        </Blend>
      </Fill>
    );
    checkImage(image, "snapshots/runtime-effects/blend-multiply.png");
  });

  it("should blend using color burn", async () => {
    const { vec } = importSkia();
    const { width } = surface;
    const r = width / 2;
    const c = vec(r, r);
    let image = await surface.draw(
      <Fill>
        <Blend mode="colorBurn">
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
        </Blend>
      </Fill>
    );
    checkImage(image, "snapshots/runtime-effects/blend-color-burn.png", {
      maxPixelDiff: 324,
    });
    image = await surface.draw(
      <Fill>
        <Blend mode="colorBurn">
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
        </Blend>
      </Fill>
    );
    checkImage(image, "snapshots/runtime-effects/blend-color-burn2.png", {
      maxPixelDiff: 324,
    });
  });

  it("should blend using multiply", async () => {
    const { vec } = importSkia();
    const { width } = surface;
    const r = width / 2;
    const c = vec(r, r);
    let image = await surface.draw(
      <Fill>
        <Blend mode="colorBurn">
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
          <RadialGradient r={r} c={c} colors={["cyan", "magenta"]} />
          <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
        </Blend>
      </Fill>
    );
    checkImage(image, "snapshots/runtime-effects/blend-color-burn3.png");
    image = await surface.draw(
      <Fill>
        <Blend mode="colorBurn">
          <RadialGradient r={r} c={c} colors={["yellow", "cyan"]} />
          <Blend mode="colorBurn">
            <RadialGradient r={r} c={c} colors={["cyan", "magenta"]} />
            <RadialGradient r={r} c={c} colors={["magenta", "yellow"]} />
          </Blend>
        </Blend>
      </Fill>
    );
    checkImage(image, "snapshots/runtime-effects/blend-color-burn3.png");
  });
});
