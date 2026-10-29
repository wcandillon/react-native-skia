import fs from "fs";

import React from "react";

import { checkImage, docPath, itRunsE2eOnly } from "../../../__tests__/setup";
import { importSkia, surface } from "../setup";
import {
  Blur,
  ColorMatrix,
  Fill,
  Group,
  ImageSVG,
  OpacityMatrix,
  Paint,
  fitbox,
} from "../../components";

import { SVGAsset } from "./setup";

const circle = new SVGAsset(
  `<svg viewBox='0 0 20 20' width="20" height="20" xmlns='http://www.w3.org/2000/svg'>
<circle cx='10' cy='10' r='10' fill='#00FFFF'/>
</svg>`,
  20,
  20
);

const circleWithText = new SVGAsset(
  `<svg viewBox='0 0 20 20' width="20" height="20" xmlns='http://www.w3.org/2000/svg'>
<circle cx='10' cy='10' r='10' fill='#00FFFF'/>
<text x="20" y="35" class="small">My</text>
</svg>`,
  20,
  20
);

const tiger = new SVGAsset(
  fs.readFileSync("src/skia/__tests__/assets/tiger.svg", "utf-8"),
  800,
  800
);

const svgWithoutSize = new SVGAsset(
  `<svg viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'>
<circle cx='10' cy='10' r='10' fill='#00FFFF'/>
</svg>`,
  -1,
  -1
);

describe("Displays SVGs", () => {
  itRunsE2eOnly(
    "should return the with and height of the SVG canvas",
    async () => {
      const [width, height] = await surface.eval((Skia) => {
        const svg = Skia.SVG
          .MakeFromString(`<svg viewBox='0 0 20 20' width="20" height="20" xmlns='http://www.w3.org/2000/svg'>
      <circle cx='10' cy='10' r='10' fill='#00ffff'/>
    </svg>`)!;
        return [svg.width(), svg.height()];
      });
      expect(width).toBe(20);
      expect(height).toBe(20);
    }
  );

  itRunsE2eOnly("should return null for malformed SVG strings", async () => {
    const isNull = await surface.eval((Skia) => {
      return Skia.SVG.MakeFromString("<not-svg>") === null;
    });
    expect(isNull).toBe(true);
  });

  itRunsE2eOnly("should return null for malformed SVG data", async () => {
    const isNull = await surface.eval((Skia) => {
      const data = Skia.Data.fromBytes(
        new Uint8Array([60, 110, 111, 116, 45, 115, 118, 103, 62])
      );
      return Skia.SVG.MakeFromData(data) === null;
    });
    expect(isNull).toBe(true);
  });

  itRunsE2eOnly("should render the SVG scaled properly", async () => {
    const { rect } = importSkia();
    const { width, height } = surface;
    const src = rect(0, 0, circle.width(), circle.height());
    const dst = rect(0, 0, width, height);
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group transform={fitbox("contain", src, dst)}>
          <ImageSVG svg={circle} />
        </Group>
      </>
    );
    checkImage(image, docPath("svg.png"));
  });

  itRunsE2eOnly("should set the SVG base layer", async () => {
    const { width, height } = surface;
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <ImageSVG svg={svgWithoutSize} width={width} height={height} />
      </>
    );
    checkImage(image, docPath("svg.png"));
  });

  itRunsE2eOnly("should set the SVG base layer", async () => {
    const { width, height } = surface;
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <ImageSVG
          svg={svgWithoutSize}
          x={width / 2}
          y={height / 2}
          width={width / 2}
          height={height / 2}
        />
      </>
    );
    checkImage(image, docPath("svg2.png"));
  });

  itRunsE2eOnly(
    "should set the SVG base layer using the rect prop",
    async () => {
      const { Skia } = importSkia();
      const { width, height } = surface;
      const image = await surface.draw(
        <>
          <Fill color="white" />
          <ImageSVG
            svg={svgWithoutSize}
            rect={Skia.XYWHRect(width / 2, height / 2, width / 2, height / 2)}
          />
        </>
      );
      checkImage(image, docPath("svg2.png"));
    }
  );

  itRunsE2eOnly("should apply an image filter to the svg", async () => {
    const { rect } = importSkia();
    const { width, height } = surface;

    const src = rect(0, 0, tiger.width(), tiger.height());
    const dst = rect(0, 0, width, height);
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group
          transform={fitbox("contain", src, dst)}
          layer={
            <Paint>
              <Blur blur={10} />
            </Paint>
          }
        >
          <ImageSVG svg={tiger} x={0} y={0} width={800} height={800} />
        </Group>
      </>
    );
    checkImage(image, docPath("blurred-tiger.png"));
  });

  itRunsE2eOnly("should apply an opacity filter to the svg", async () => {
    const { rect } = importSkia();
    const { width, height } = surface;

    const src = rect(0, 0, tiger.width(), tiger.height());
    const dst = rect(0, 0, width, height);
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group
          transform={fitbox("contain", src, dst)}
          layer={
            <Paint>
              <ColorMatrix matrix={OpacityMatrix(0.5)} />
            </Paint>
          }
        >
          <ImageSVG svg={tiger} x={0} y={0} width={800} height={800} />
        </Group>
      </>
    );
    // TODO: Currently there are artifacts on Graphite/iOS
    checkImage(image, docPath("opacity-tiger.png"), { maxPixelDiff: 1000 });
  });

  itRunsE2eOnly("text shouldn't crash on iOS", async () => {
    const { rect } = importSkia();
    const { width, height } = surface;
    const src = rect(0, 0, circle.width(), circle.height());
    const dst = rect(0, 0, width, height);
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group transform={fitbox("contain", src, dst)}>
          <ImageSVG svg={circleWithText} />
        </Group>
      </>
    );
    checkImage(image, docPath("svg.png"));
  });
});
