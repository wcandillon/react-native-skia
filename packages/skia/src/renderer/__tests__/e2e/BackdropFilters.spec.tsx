import React from "react";

import { checkImage, docPath } from "../../../__tests__/setup";
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
import { importSkia, surface, images } from "../setup";
import { Group } from "../../components/Group";

// https://kazzkiq.github.io/svg-color-filter/
const BLACK_AND_WHITE = [
  0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0,
];

describe("Backdrop Filters", () => {
  it("A black and white color filter as backdrop color filter", async () => {
    const { oslo } = images;
    const { width } = surface;
    const size = width;
    const img = await surface.draw(
      <Group>
        <Image
          image={oslo}
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
    checkImage(img, docPath("black-and-white-backdrop-filter.png"));
  });
  it("Blur backdrop filter", async () => {
    const { oslo } = images;
    const { width } = surface;
    const size = width;
    const img = await surface.draw(
      <Group>
        <Fill color="white" />
        <Image
          image={oslo}
          x={0}
          y={0}
          width={width}
          height={width}
          fit="cover"
        />
        <BackdropBlur
          blur={4 / 3}
          clip={{ x: 0, y: size / 2, width: size, height: size / 2 }}
        >
          <Fill color="rgba(0, 0, 0, 0.5)" />
        </BackdropBlur>
      </Group>
    );
    checkImage(img, docPath("blur-backdrop-filter.png"));
  });
  it("should display the Aurora Example", async () => {
    const { width, height } = surface;
    const { vec } = importSkia();
    const c = vec(width / 2, height / 2);
    const r = c.x - 32 / 3;
    const clip = { x: 0, y: c.y, width, height: c.y };
    const img = await surface.draw(
      <>
        <Fill color="black" />
        <Circle c={c} r={r}>
          <LinearGradient
            start={vec(c.x - r, c.y - r)}
            end={vec(c.x + r, c.y + r)}
            colors={["#FFF723", "#E70696"]}
          />
        </Circle>
        <BackdropFilter filter={<Blur blur={10 / 3} />} clip={clip}>
          <Fill color="rgba(0, 0, 0, 0.3)" />
        </BackdropFilter>
      </>
    );
    checkImage(img, docPath("blur-backdrop-aurora.png"));
  });
  it("should display the Aurora Example with the BackdropBlur component", async () => {
    const { width, height } = surface;
    const { vec } = importSkia();
    const c = vec(width / 2, height / 2);
    const r = c.x - 32 / 3;
    const clip = { x: 0, y: c.y, width, height: c.y };
    const img = await surface.draw(
      <>
        <Fill color="black" />
        <Circle c={c} r={r}>
          <LinearGradient
            start={vec(c.x - r, c.y - r)}
            end={vec(c.x + r, c.y + r)}
            colors={["#FFF723", "#E70696"]}
          />
        </Circle>
        <BackdropBlur blur={10 / 3} clip={clip}>
          <Fill color="rgba(0, 0, 0, 0.3)" />
        </BackdropBlur>
      </>
    );
    checkImage(img, docPath("blur-backdrop-aurora.png"));
  });
  it("should display the Aurora Example with the BackdropBlur component and a string as clipping path", async () => {
    const { width, height } = surface;
    const { vec, Skia } = importSkia();
    const c = vec(width / 2, height / 2);
    const r = c.x - 32 / 3;
    const path = Skia.Path.Rect(Skia.XYWHRect(0, c.y, width, c.y));
    const clip = path.toSVGString();
    const img = await surface.draw(
      <>
        <Fill color="black" />
        <Circle c={c} r={r}>
          <LinearGradient
            start={vec(c.x - r, c.y - r)}
            end={vec(c.x + r, c.y + r)}
            colors={["#FFF723", "#E70696"]}
          />
        </Circle>
        <BackdropBlur blur={10 / 3} clip={clip}>
          <Fill color="rgba(0, 0, 0, 0.3)" />
        </BackdropBlur>
      </>
    );
    checkImage(img, docPath("blur-backdrop-aurora.png"));
  });
  it("Blur backdrop blur on text with white background", async () => {
    const { width, height } = surface;
    const { rect } = importSkia();
    const img = await surface.draw(
      <>
        <Circle c={{ x: 0, y: 0 }} r={100} color="black" />
        <BackdropBlur blur={10 / 3} clip={rect(0, 0, width, height)} />
      </>
    );
    checkImage(img, docPath("backdrop-circle.png"));
  });
  it("Blur backdrop blur on text with opaque background", async () => {
    const { width, height } = surface;
    const { rect } = importSkia();
    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Circle c={{ x: 0, y: 0 }} r={100} color="black" />
        <BackdropBlur blur={10 / 3} clip={rect(0, 0, width, height)} />
      </>
    );
    checkImage(img, docPath("backdrop-circle-opaque.png"));
  });
});
