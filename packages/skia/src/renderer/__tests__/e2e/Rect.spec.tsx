import React from "react";

import { checkImage, docPath } from "../../../__tests__/setup";
import { Fill, Path, RoundedRect } from "../../components";
import { importSkia, surface } from "../setup";

describe("Rects and rounded rects", () => {
  it("The rounded rectangle radii should be scale to its maximum value", async () => {
    const result = await surface.eval((Skia) => {
      const rrect = Skia.RRectXY(Skia.XYWHRect(0, 0, 100, 100), 200, 200);
      return { rx: rrect.rx, ry: rrect.ry };
    });
    expect(result).toEqual({ rx: 50, ry: 50 });

    const result1 = await surface.eval((Skia) => {
      const rrect = Skia.RRectXY(Skia.XYWHRect(0, 0, 100, 100), 200, 20);
      return { rx: rrect.rx, ry: rrect.ry };
    });
    expect(result1).toEqual({ rx: 50, ry: 5 });

    const result2 = await surface.eval((Skia) => {
      const rrect = Skia.RRectXY(Skia.XYWHRect(0, 0, 100, 100), 0, 0);
      return rrect.rx + rrect.ry;
    });
    expect(result2).toBe(0);

    const result3 = await surface.eval((Skia) => {
      const rrect = Skia.RRectXY(Skia.XYWHRect(0, 0, 100, 100), 10, 20);
      return { rx: rrect.rx, ry: rrect.ry };
    });
    expect(result3).toEqual({ rx: 10, ry: 20 });
  });
  it("Should draw a rounded rect with uniform values (1)", async () => {
    const { width } = surface;
    const r = width * 0.2;
    const image = await surface.draw(
      <RoundedRect
        x={0}
        y={0}
        width={width}
        height={width}
        r={r}
        color="lightblue"
      />
    );
    checkImage(image, docPath("rrect/uniform.png"));
  });
  it("Should draw a rounded rect with uniform values (2)", async () => {
    const { Skia } = importSkia();
    const { width } = surface;
    const r = width * 0.2;
    const rrct = Skia.RRectXY(Skia.XYWHRect(0, 0, width, width), r, r);
    const image = await surface.draw(
      <RoundedRect rect={rrct} color="lightblue" />
    );
    checkImage(image, docPath("rrect/uniform.png"));
  });
  it("Should draw a rounded rect with uniform values (3)", async () => {
    const { width } = surface;
    const r = width * 0.2;
    const rrct = {
      rect: { x: 0, y: 0, width, height: width },
      topLeft: { x: r, y: r },
      topRight: { x: r, y: r },
      bottomRight: { x: r, y: r },
      bottomLeft: { x: r, y: r },
    };
    const image = await surface.draw(
      <RoundedRect rect={rrct} color="lightblue" />
    );
    checkImage(image, docPath("rrect/uniform.png"));
  });
  it("Should draw a rounded rect with uniform values (4)", async () => {
    const { width } = surface;
    const r = width * 0.2;
    const { Skia } = importSkia();
    const rrct = Skia.RRectXY(Skia.XYWHRect(0, 0, width, width), r, r);
    const path = Skia.Path.RRect(rrct);
    const image = await surface.draw(<Path path={path} color="lightblue" />);
    checkImage(image, docPath("rrect/uniform.png"));
  });
  it("Should draw a rounded rect with non-uniform values (1)", async () => {
    const { width } = surface;
    const r = width * 0.2;
    const rrct = {
      rect: { x: 0, y: 0, width, height: width },
      topLeft: { x: 0, y: 0 },
      topRight: { x: r, y: r },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: r, y: r },
    };
    const image = await surface.draw(
      <RoundedRect rect={rrct} color="lightblue" />
    );
    checkImage(image, docPath("rrect/nonuniform.png"));
  });
  it("Should draw a rounded rect with non-uniform values (2)", async () => {
    const { Skia } = importSkia();
    const { width } = surface;
    const r = width * 0.2;
    const rrct = {
      rect: { x: 0, y: 0, width, height: width },
      topLeft: { x: 0, y: 0 },
      topRight: { x: r, y: r },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: r, y: r },
    };
    const path = Skia.Path.RRect(rrct);
    const image = await surface.draw(<Path path={path} color="lightblue" />);
    checkImage(image, docPath("rrect/nonuniform.png"));
  });
  it("Should draw a rounded rect with non-uniform values (3)", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const r = width * 0.2;
    const barPath = Skia.Path.RRect({
      rect: { x: 0, y: 0, width, height },
      topLeft: { x: r, y: r },
      topRight: { x: r, y: r },
      bottomLeft: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
    });
    const image = await surface.draw(<Path path={barPath} color="lightblue" />);
    checkImage(image, docPath("rrect/test.png"));
  });
  /*
   */
  it("Supports CSS3 colors (1)", async () => {
    const image = await surface.draw(<Fill color="hsl(120, 100%, 50%)" />);
    checkImage(image, docPath("fill/green.png"));
  });
  it("Supports CSS3 colors (2)", async () => {
    const image = await surface.draw(<Fill color="hsla(120, 100%, 50%, 1)" />);
    checkImage(image, docPath("fill/green.png"));
  });
});
