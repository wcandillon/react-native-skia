import React from "react";

import { docPath, processResult } from "../../../__tests__/setup";
import {
  BackdropBlur,
  BackdropFilter,
  Blur,
  Circle,
  ColorMatrix,
  Fill,
  Image,
  LinearGradient,
} from "../../components";
import { drawOnNode, width, loadImage, importSkia, height } from "../setup";
import { Group } from "../../components/Group";

const size = width;
// https://kazzkiq.github.io/svg-color-filter/
const BLACK_AND_WHITE = [
  0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0,
];

describe("Backdrop Filters", () => {
  it("A black and white color filter as backdrop color filter", () => {
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    expect(image).toBeTruthy();
    const surface = drawOnNode(
      <Group>
        <Image
          image={image}
          x={0}
          y={0}
          width={width}
          height={width}
          fit="cover"
        />
        <BackdropFilter
          clip={{ x: 0, y: size / 2, width: size, height: size / 2 }}
          filter={<ColorMatrix matrix={BLACK_AND_WHITE} />}
        />
      </Group>
    );
    processResult(surface, docPath("black-and-white-backdrop-filter.png"));
  });
  it("Blur backdrop filter", () => {
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    expect(image).toBeTruthy();
    const surface = drawOnNode(
      <Group>
        <Image
          image={image}
          x={0}
          y={0}
          width={width}
          height={width}
          fit="cover"
        />
        <BackdropBlur
          blur={4}
          clip={{ x: 0, y: size / 2, width: size, height: size / 2 }}
        >
          <Fill color="rgba(0, 0, 0, 0.2)" />
        </BackdropBlur>
      </Group>
    );
    processResult(surface, docPath("blur-backdrop-filter.png"));
  });
  it("should display the Aurora Example", () => {
    const { vec } = importSkia();
    const c = vec(width / 2, height / 2);
    const r = c.x - 32;
    const clip = { x: 0, y: c.y, width, height: c.y };
    const surface = drawOnNode(
      <>
        <Fill color="black" />
        <Circle c={c} r={r}>
          <LinearGradient
            start={vec(c.x - r, c.y - r)}
            end={vec(c.x + r, c.y + r)}
            colors={["#FFF723", "#E70696"]}
          />
        </Circle>
        <BackdropFilter filter={<Blur blur={10} />} clip={clip}>
          <Fill color="rgba(0, 0, 0, 0.3)" />
        </BackdropFilter>
      </>
    );
    processResult(surface, docPath("blur-backdrop-aurora.png"));
  });
});
