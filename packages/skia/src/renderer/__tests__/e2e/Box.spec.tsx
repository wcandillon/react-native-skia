import React from "react";

import { checkImage, docPath } from "../../../__tests__/setup";
import { Box, BoxShadow, Fill, FitBox } from "../../components";
import { surface, importSkia, PIXEL_RATIO } from "../setup";

describe("Box", () => {
  it("should draw a box with inner and outer shadow", async () => {
    const { rect, rrect } = importSkia();
    const { width } = surface;
    const size = width / 2;
    const d = 10 * PIXEL_RATIO;
    const img = await surface.draw(
      <>
        <Fill color="#add8e6" />
        <Box
          box={rrect(rect(size / 2, size / 2, size, size), 24, 24)}
          color="#add8e6"
        >
          <BoxShadow dx={d} dy={d} blur={d} color="#93b8c4" inner />
          <BoxShadow dx={-d} dy={-d} blur={d} color="#c7f8ff" inner />
          <BoxShadow dx={d} dy={d} blur={d} color="#93b8c4" />
          <BoxShadow dx={-d} dy={-d} blur={d} color="#c7f8ff" />
        </Box>
      </>
    );
    checkImage(img, docPath("box/box-shadow.png"));
  });
  it("should render negative values", async () => {
    const { rect } = importSkia();
    const { width } = surface;
    const w = width;
    const h = width;
    const src = { x: 15, y: 15, width: w - 30, height: h - 30 };
    const img = await surface.draw(
      <FitBox src={src} dst={rect(30, 15, w - 30, h - 10)}>
        <Box box={src} color={"white"}>
          <BoxShadow dx={5} dy={12} blur={5} color={"red"} />
          <BoxShadow dx={5} dy={12} blur={5} color={"red"} />
          <BoxShadow dx={-5} dy={-12} blur={5} color={"green"} />
          <BoxShadow dx={-5} dy={-12} blur={5} color={"green"} />
        </Box>
      </FitBox>
    );
    checkImage(img, "snapshots/box/box-shadow2.png");
  });
  it("should render have rounded corners", async () => {
    const { rect } = importSkia();
    const { width } = surface;
    const w = width;
    const h = width;
    const src = { x: 15, y: 15, width: w - 30, height: h - 30 };
    const border = { rect: src, rx: 10, ry: 10 };
    const img = await surface.draw(
      <FitBox src={src} dst={rect(30, 15, w - 30, h - 10)}>
        <Box box={border} color={"white"}>
          <BoxShadow dx={5} dy={12} blur={5} color={"red"} />
          <BoxShadow dx={5} dy={12} blur={5} color={"red"} />
          <BoxShadow dx={-5} dy={-12} blur={5} color={"green"} />
          <BoxShadow dx={-5} dy={-12} blur={5} color={"green"} />
        </Box>
      </FitBox>
    );
    checkImage(img, "snapshots/box/box-shadow3.png");
  });

  it("should draw a box with red stroke", async () => {
    const { width } = surface;
    const size = width / 2;
    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Box
          box={{ width: size, height: size, x: 1 / 3, y: 1 / 3 }}
          color="red"
          style="stroke"
          strokeWidth={2 / 3}
        />
      </>
    );
    checkImage(img, "snapshots/box/box-stroke.png");
  });

  it("should draw a shadow with opacity", async () => {
    const { rect } = importSkia();
    const { width } = surface;
    const size = width / 2;
    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Box box={rect(size / 2, size / 2, size, size)} color="red">
          <BoxShadow
            dx={0}
            dy={0}
            blur={5}
            spread={10}
            inner
            color={"rgba(0, 0, 255, 0.5)"}
          />
        </Box>
      </>
    );
    checkImage(img, "snapshots/box/box-shadow-opacity.png");
  });
});
