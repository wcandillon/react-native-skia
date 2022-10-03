import React from "react";

import { docPath, processResult } from "../../__tests__/setup";
import {
  BlendColor,
  Circle,
  ColorMatrix,
  Group,
  Image,
  Lerp,
  LinearToSRGBGamma,
  SRGBToLinearGamma,
} from "../components";

import { drawOnNode, height, width, loadImage } from "./setup";

describe("Color Filters", () => {
  it("should apply a color matrix to an image", () => {
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    const surface = drawOnNode(
      <Image
        x={0}
        y={0}
        width={width}
        height={height}
        image={image}
        fit="cover"
      >
        <ColorMatrix
          matrix={[
            -0.578, 0.99, 0.588, 0, 0, 0.469, 0.535, -0.003, 0, 0, 0.015, 1.69,
            -0.703, 0, 0, 0, 0, 0, 1, 0,
          ]}
        />
      </Image>
    );
    processResult(surface, docPath("color-filters/color-matrix.png"));
  });
  it("should blend a color", () => {
    const r = width / 2;
    const surface = drawOnNode(
      <>
        <Group>
          <BlendColor color="cyan" mode="multiply" />
          <Circle cx={r} cy={r} r={r} color="yellow" />
          <Circle cx={2 * r} cy={r} r={r} color="magenta" />
        </Group>
      </>
    );
    processResult(surface, docPath("color-filters/color-blend.png"));
  });
  it("should use composition", () => {
    const r = width / 2;
    const surface = drawOnNode(
      <Group>
        <SRGBToLinearGamma>
          <BlendColor color="lightblue" mode="srcIn" />
        </SRGBToLinearGamma>
        <Circle cx={r} cy={r} r={r} />
        <Circle cx={2 * r} cy={r} r={r} color="red" />
      </Group>
    );
    processResult(surface, docPath("color-filters/composition.png"));
  });
  it("should use linear interpolation between two color matrices", () => {
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    const blackAndWhite = [
      0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0,
    ];
    const purple = [
      1, -0.2, 0, 0, 0, 0, 1, 0, -0.1, 0, 0, 1.2, 1, 0.1, 0, 0, 0, 1.7, 1, 0,
    ];
    const surface = drawOnNode(
      <>
        <Image
          x={0}
          y={0}
          width={width}
          height={height}
          image={image}
          fit="cover"
        >
          <LinearToSRGBGamma>
            <Lerp t={0.5}>
              <ColorMatrix matrix={purple} />
              <ColorMatrix matrix={blackAndWhite} />
            </Lerp>
          </LinearToSRGBGamma>
        </Image>
      </>
    );
    processResult(surface, docPath("color-filters/lerp.png"));
  });
});
