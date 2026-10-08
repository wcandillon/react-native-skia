import fs from "fs";
import nodePath from "path";

import React from "react";

import { processResult } from "../../__tests__/setup";
import { Circle, FitBox, Rect, Image, Group, fitbox } from "../components";

import { drawOnNode, width, height, importSkia } from "./setup";

describe("FitBox", () => {
  it("Should scale the rectangle in half", async () => {
    const { Skia } = importSkia();
    const surface = await drawOnNode(
      <FitBox
        src={Skia.XYWHRect(0, 0, width, height)}
        dst={Skia.XYWHRect(width / 4, height / 4, width / 2, height / 2)}
      >
        <Rect x={0} y={0} width={width} height={height} color="lightblue" />
      </FitBox>
    );
    processResult(surface, "snapshots/drawings/lightblue-rect.png");
  });
  it("Should take the bottom right quarter of the circle and scale to the full canvas", async () => {
    const { Skia } = importSkia();
    const surface = await drawOnNode(
      <FitBox
        src={Skia.XYWHRect(width / 2, height / 2, width / 2, height / 2)}
        dst={Skia.XYWHRect(0, 0, width, height)}
      >
        <Circle
          r={width / 2}
          cx={width / 2}
          cy={height / 2}
          color="lightblue"
        />
      </FitBox>
    );
    processResult(surface, "snapshots/drawings/lightblue-quarter-circle.png");
  });
  it("Should scale the image (1)", async () => {
    const { Skia, rect } = importSkia();
    const image = Skia.Image.MakeImageFromEncoded(
      Skia.Data.fromBytes(
        fs.readFileSync(
          nodePath.resolve(__dirname, "../../skia/__tests__/assets/box.png")
        )
      )
    )!;
    const surface = await drawOnNode(
      <Group
        transform={fitbox(
          "cover",
          rect(0, 0, image.width(), image.height()),
          rect(0, 0, width, height)
        )}
      >
        <Image
          image={image}
          x={0}
          y={0}
          width={image.width()}
          height={image.height()}
        />
      </Group>
    );
    processResult(surface, "snapshots/drawings/scaled-image.png");
  });
  it("Should scale the image (2)", async () => {
    const { Skia, rect } = importSkia();
    const image = Skia.Image.MakeImageFromEncoded(
      Skia.Data.fromBytes(
        fs.readFileSync(
          nodePath.resolve(__dirname, "../../skia/__tests__/assets/box.png")
        )
      )
    )!;
    const screen = rect(256, 128, 256, 512);
    const surface = await drawOnNode(
      <Group>
        <Image
          image={image}
          x={0}
          y={0}
          width={image.width()}
          height={image.height()}
          transform={fitbox(
            "cover",
            rect(0, 0, image.width(), image.height()),
            screen
          )}
        />
        <Rect rect={screen} color="green" opacity={0.5} />
      </Group>
    );
    processResult(surface, "snapshots/drawings/scaled-image2.png");
  });
  it("Should rotate and scale the image", async () => {
    const { Skia, rect } = importSkia();
    const image = Skia.Image.MakeImageFromEncoded(
      Skia.Data.fromBytes(
        fs.readFileSync(
          nodePath.resolve(__dirname, "../../skia/__tests__/assets/box2.png")
        )
      )
    )!;
    const screen = rect(256, 128, 256, 512);
    const imageRect = rect(0, 0, image.width(), image.height());
    const transform = fitbox("contain", imageRect, screen, 270);
    const surface = await drawOnNode(
      <Group>
        <Image
          image={image}
          x={0}
          y={0}
          width={image.width()}
          height={image.height()}
          fit="none"
          transform={transform}
        />
        <Rect rect={screen} color="green" opacity={0.5} />
      </Group>
    );
    processResult(surface, "snapshots/drawings/rotated-scaled-image.png");
  });

  test("transform simple rectangle with fitbox fill", () => {
    const { Skia, processTransform2d } = importSkia();

    const path = Skia.PathBuilder.Make()
      .moveTo(0, 0)
      .lineTo(10, 0)
      .lineTo(10, 10)
      .lineTo(0, 10)
      .close()
      .build();

    const src = path.computeTightBounds();
    const dst = Skia.XYWHRect(0, 0, 20, 20);
    const transform = fitbox("fill", src, dst);
    const c = Skia.PathBuilder.MakeFromPath(path.copy())
      .transform(processTransform2d(transform))
      .build();
    const newBounds = c.computeTightBounds();
    expect(newBounds.x).toBe(0);
    expect(newBounds.y).toBe(0);
    expect(newBounds.width).toBe(20);
    expect(newBounds.height).toBe(20);
  });

  test("transform simple rectangle with fitbox contain", () => {
    const { Skia, processTransform2d } = importSkia();

    const path = Skia.PathBuilder.Make()
      .moveTo(0, 0)
      .lineTo(10, 0)
      .lineTo(10, 5)
      .lineTo(0, 5)
      .close()
      .build();

    const src = path.computeTightBounds();

    const dst = Skia.XYWHRect(0, 0, 20, 20);
    const matrix = fitbox("contain", src, dst);

    const transformedPath = Skia.PathBuilder.MakeFromPath(path)
      .transform(processTransform2d(matrix))
      .build();
    const newBounds = transformedPath.computeTightBounds();
    expect(newBounds.x).toBe(0);
    expect(newBounds.y).toBe(5);
    expect(newBounds.width).toBe(20);
    expect(newBounds.height).toBe(10);
  });

  test("transform line with fitbox scale", () => {
    const { Skia, processTransform2d } = importSkia();
    const path = Skia.PathBuilder.Make().moveTo(0, 0).lineTo(5, 5).build();

    const src = path.computeTightBounds();
    const dst = Skia.XYWHRect(0, 0, 10, 10);
    const matrix = fitbox("fill", src, dst);
    const transformedPath = Skia.PathBuilder.MakeFromPath(path)
      .transform(processTransform2d(matrix))
      .build();
    const newBounds = transformedPath.computeTightBounds();
    expect(newBounds.x).toBe(0);
    expect(newBounds.y).toBe(0);
    expect(newBounds.width).toBe(10);
    expect(newBounds.height).toBe(10);
  });

  test("transform with offset destination", () => {
    const { Skia, processTransform2d } = importSkia();
    const path = Skia.PathBuilder.Make()
      .moveTo(0, 0)
      .lineTo(4, 0)
      .lineTo(4, 4)
      .lineTo(0, 4)
      .close()
      .build();

    const src = path.computeTightBounds();
    const dst = Skia.XYWHRect(10, 20, 8, 8);
    const matrix = fitbox("fill", src, dst);
    const transformedPath = Skia.PathBuilder.MakeFromPath(path)
      .transform(processTransform2d(matrix))
      .build();
    const newBounds = transformedPath.computeTightBounds();
    expect(newBounds.x).toBe(10);
    expect(newBounds.y).toBe(20);
    expect(newBounds.width).toBe(8);
    expect(newBounds.height).toBe(8);
  });

  test("transform with cover fit mode", () => {
    const { Skia, processTransform2d } = importSkia();
    const path = Skia.PathBuilder.Make()
      .moveTo(0, 0)
      .lineTo(10, 0)
      .lineTo(10, 5)
      .lineTo(0, 5)
      .close()
      .build();

    const src = path.computeTightBounds();
    const dst = Skia.XYWHRect(0, 0, 10, 10);
    const matrix = fitbox("cover", src, dst);
    const transformedPath = Skia.PathBuilder.MakeFromPath(path)
      .transform(processTransform2d(matrix))
      .build();
    const newBounds = transformedPath.computeTightBounds();
    expect(newBounds.x).toBe(-5);
    expect(newBounds.y).toBe(0);
    expect(newBounds.width).toBe(20);
    expect(newBounds.height).toBe(10);
  });

  describe("rect2rect", () => {
    test("basic scaling from unit square to double size", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(0, 0, 1, 1);
      const dst = Skia.XYWHRect(0, 0, 2, 2);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: 0 },
        { translateY: 0 },
        { scaleX: 2 },
        { scaleY: 2 },
      ]);
    });

    test("scaling with translation", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(0, 0, 10, 10);
      const dst = Skia.XYWHRect(5, 5, 20, 20);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: 5 },
        { translateY: 5 },
        { scaleX: 2 },
        { scaleY: 2 },
      ]);
    });

    test("scaling with non-zero source origin", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(10, 10, 20, 20);
      const dst = Skia.XYWHRect(0, 0, 40, 40);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: -20 },
        { translateY: -20 },
        { scaleX: 2 },
        { scaleY: 2 },
      ]);
    });

    test("shrinking transformation", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(0, 0, 100, 100);
      const dst = Skia.XYWHRect(0, 0, 50, 50);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: 0 },
        { translateY: 0 },
        { scaleX: 0.5 },
        { scaleY: 0.5 },
      ]);
    });

    test("non-uniform scaling", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(0, 0, 10, 20);
      const dst = Skia.XYWHRect(0, 0, 30, 40);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: 0 },
        { translateY: 0 },
        { scaleX: 3 },
        { scaleY: 2 },
      ]);
    });

    test("transformation with offset source and destination", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(5, 10, 15, 20);
      const dst = Skia.XYWHRect(50, 100, 30, 40);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: 40 },
        { translateY: 80 },
        { scaleX: 2 },
        { scaleY: 2 },
      ]);
    });

    test("identity transformation", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(10, 20, 30, 40);
      const dst = Skia.XYWHRect(10, 20, 30, 40);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: 0 },
        { translateY: 0 },
        { scaleX: 1 },
        { scaleY: 1 },
      ]);
    });

    test("fractional scaling", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(0, 0, 3, 4);
      const dst = Skia.XYWHRect(0, 0, 1.5, 2);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: 0 },
        { translateY: 0 },
        { scaleX: 0.5 },
        { scaleY: 0.5 },
      ]);
    });

    test("complex transformation with negative coordinates", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(-10, -20, 20, 30);
      const dst = Skia.XYWHRect(10, 5, 40, 60);
      const result = rect2rect(src, dst);

      expect(result).toEqual([
        { translateX: 30 },
        { translateY: 45 },
        { scaleX: 2 },
        { scaleY: 2 },
      ]);
    });

    test("very small dimensions", () => {
      const { Skia, rect2rect } = importSkia();
      const src = Skia.XYWHRect(0, 0, 0.1, 0.1);
      const dst = Skia.XYWHRect(0, 0, 1, 1);
      const result = rect2rect(src, dst);

      expect(result[0]).toEqual({ translateX: 0 });
      expect(result[1]).toEqual({ translateY: 0 });
      expect(result[2].scaleX).toBeCloseTo(10, 5);
      expect(result[3].scaleY).toBeCloseTo(10, 5);
    });
  });

  describe("fitRects", () => {
    test("fill mode - source fills destination completely", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 100, 50);
      const dstRect = Skia.XYWHRect(10, 20, 200, 100);
      const result = fitRects("fill", srcRect, dstRect);

      expect(result.src).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      expect(result.dst).toEqual({
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      });
    });

    test("contain mode - source fits inside destination maintaining aspect ratio", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 100, 50);
      const dstRect = Skia.XYWHRect(0, 0, 200, 200);
      const result = fitRects("contain", srcRect, dstRect);

      expect(result.src).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      // Should maintain aspect ratio 2:1, so width=200, height=100, centered
      expect(result.dst.width).toBe(200);
      expect(result.dst.height).toBe(100);
      expect(result.dst.x).toBe(0);
      expect(result.dst.y).toBe(50); // Centered vertically
    });

    test("cover mode - source covers destination completely", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 100, 50);
      const dstRect = Skia.XYWHRect(0, 0, 100, 100);
      const result = fitRects("cover", srcRect, dstRect);

      // Source should be cropped to fit destination aspect ratio
      expect(result.src.width).toBe(50); // Cropped to maintain 1:1 aspect ratio
      expect(result.src.height).toBe(50);
      expect(result.src.x).toBe(25); // Centered horizontally in original rect
      expect(result.src.y).toBe(0);

      expect(result.dst).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
    });

    test("fitWidth mode - fits to width, adjusts height", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 100, 50);
      const dstRect = Skia.XYWHRect(0, 0, 200, 200);
      const result = fitRects("fitWidth", srcRect, dstRect);

      // Source is scaled to fit the destination width aspect ratio
      expect(result.src.width).toBe(100);
      expect(result.src.height).toBe(100);
      expect(result.src.x).toBe(0);
      expect(result.src.y).toBe(-25); // Extends beyond original rect to maintain aspect ratio

      // Destination uses the full destination rectangle
      expect(result.dst.width).toBe(200);
      expect(result.dst.height).toBe(200);
      expect(result.dst.x).toBe(0);
      expect(result.dst.y).toBe(0);
    });

    test("fitHeight mode - fits to height, adjusts width", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 100, 50);
      const dstRect = Skia.XYWHRect(0, 0, 200, 200);
      const result = fitRects("fitHeight", srcRect, dstRect);

      // Source is cropped to fit the destination height aspect ratio
      expect(result.src.width).toBe(50);
      expect(result.src.height).toBe(50);
      expect(result.src.x).toBe(25); // Centered horizontally in original rect
      expect(result.src.y).toBe(0);

      // Destination uses the full destination rectangle
      expect(result.dst.width).toBe(200);
      expect(result.dst.height).toBe(200);
      expect(result.dst.x).toBe(0);
      expect(result.dst.y).toBe(0);
    });

    test("none mode - uses minimum dimensions", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 100, 50);
      const dstRect = Skia.XYWHRect(0, 0, 80, 120);
      const result = fitRects("none", srcRect, dstRect);

      // Should use minimum of source and destination dimensions
      expect(result.src.width).toBe(80); // min(100, 80)
      expect(result.src.height).toBe(50); // min(50, 120)
      expect(result.src.x).toBe(10); // Centered in source rect
      expect(result.src.y).toBe(0);

      expect(result.dst.width).toBe(80);
      expect(result.dst.height).toBe(50);
      expect(result.dst.x).toBe(0);
      expect(result.dst.y).toBe(35); // Centered in destination rect
    });

    test("scaleDown mode - scales down if needed", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 200, 100);
      const dstRect = Skia.XYWHRect(0, 0, 100, 80);
      const result = fitRects("scaleDown", srcRect, dstRect);

      expect(result.src).toEqual({
        x: 0,
        y: 0,
        width: 200,
        height: 100,
      });

      // Should scale down to fit within destination
      expect(result.dst.width).toBe(100);
      expect(result.dst.height).toBe(50); // Maintains aspect ratio 2:1
      expect(result.dst.x).toBe(0);
      expect(result.dst.y).toBe(15); // Centered vertically
    });

    test("scaleDown mode - no scaling if source is smaller", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 50, 25);
      const dstRect = Skia.XYWHRect(0, 0, 100, 100);
      const result = fitRects("scaleDown", srcRect, dstRect);

      expect(result.src).toEqual({
        x: 0,
        y: 0,
        width: 50,
        height: 25,
      });

      // Should not scale up, keep original size
      expect(result.dst.width).toBe(50);
      expect(result.dst.height).toBe(25);
      expect(result.dst.x).toBe(25); // Centered horizontally
      expect(result.dst.y).toBe(37.5); // Centered vertically
    });

    test("with offset source rectangle", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(50, 100, 100, 50);
      const dstRect = Skia.XYWHRect(10, 20, 200, 100);
      const result = fitRects("fill", srcRect, dstRect);

      expect(result.src).toEqual({
        x: 50,
        y: 100,
        width: 100,
        height: 50,
      });
      expect(result.dst).toEqual({
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      });
    });

    test("with very small source rectangle", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 1, 1);
      const dstRect = Skia.XYWHRect(0, 0, 100, 100);
      const result = fitRects("contain", srcRect, dstRect);

      expect(result.src).toEqual({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      });
      expect(result.dst).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
    });

    test("with zero dimensions - should return empty sizes", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 0, 100);
      const dstRect = Skia.XYWHRect(0, 0, 100, 100);
      const result = fitRects("fill", srcRect, dstRect);

      expect(result.src).toEqual({
        x: 0,
        y: 50,
        width: 0,
        height: 0,
      });
      expect(result.dst).toEqual({
        x: 50,
        y: 50,
        width: 0,
        height: 0,
      });
    });

    test("cover mode with wide source rectangle", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 200, 50);
      const dstRect = Skia.XYWHRect(0, 0, 100, 100);
      const result = fitRects("cover", srcRect, dstRect);

      // Source should be cropped to square aspect ratio
      expect(result.src.width).toBe(50); // Cropped width
      expect(result.src.height).toBe(50);
      expect(result.src.x).toBe(75); // Centered horizontally
      expect(result.src.y).toBe(0);

      expect(result.dst).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
    });

    test("cover mode with tall destination rectangle", () => {
      const { Skia, fitRects } = importSkia();
      const srcRect = Skia.XYWHRect(0, 0, 100, 100);
      const dstRect = Skia.XYWHRect(0, 0, 50, 200);
      const result = fitRects("cover", srcRect, dstRect);

      // Source should be cropped to 1:4 aspect ratio
      expect(result.src.width).toBe(25); // Cropped to match destination aspect ratio
      expect(result.src.height).toBe(100);
      expect(result.src.x).toBe(37.5); // Centered horizontally
      expect(result.src.y).toBe(0);

      expect(result.dst).toEqual({
        x: 0,
        y: 0,
        width: 50,
        height: 200,
      });
    });
  });
  describe("Path bounds", () => {
    test("computes bounds for cubic with extreme control points", () => {
      const { Skia } = importSkia();
      const path = Skia.PathBuilder.Make()
        .moveTo(0, 0)
        .cubicTo(-50, 100, 150, -50, 100, 100)
        .build();
      const bounds = path.computeTightBounds();
      // bounds is -8.09475040435791 0 116.1894998550415 100
      expect(bounds.x).toBeCloseTo(-8.09475, 2);
      expect(bounds.y).toBeCloseTo(0, 2);
      expect(bounds.width).toBeCloseTo(116.1895, 2);
      expect(bounds.height).toBeCloseTo(100, 2);
    });
    test("computes bounds for cubic forming loop", () => {
      const { Skia } = importSkia();
      const path = Skia.PathBuilder.Make()
        .moveTo(0, 0)
        .cubicTo(100, 0, 100, 100, 0, 50)
        .build();
      const bounds = path.computeTightBounds();
      expect(bounds.x).toBeCloseTo(0, 2);
      expect(bounds.y).toBeCloseTo(0, 2);
      expect(bounds.width).toBeCloseTo(75, 2);
      expect(bounds.height).toBeCloseTo(64, 2);
    });
    test("computes bounds for multiple cubics forming complex path", () => {
      const { Skia } = importSkia();
      const path = Skia.PathBuilder.Make()
        .moveTo(0, 50)
        .cubicTo(25, 0, 75, 100, 100, 50)
        .moveTo(100, 50)
        .cubicTo(125, 0, 175, 100, 200, 50)
        .moveTo(200, 50)
        .cubicTo(225, 100, 275, 0, 300, 50)
        .build();

      const bounds = path.computeTightBounds();
      expect(bounds.x).toBeCloseTo(0, 2);
      expect(bounds.y).toBeCloseTo(35.56624221801758, 2);
      expect(bounds.width).toBeCloseTo(300, 2);
      expect(bounds.height).toBeCloseTo(28.867511749267578, 2);
    });
    test("draw Skia logo", () => {
      const skiaLogo =
        "M465.63 273.956C409.11 212.516 348.87 258.846 362.34 310.646C367.09 328.936 381.05 347.906 407.6 363.056C444.3 383.986 460.05 408.286 461.42 430.426C464.57 481.036 392.6 520.356 324 482.376M490 430.426C589.17 299.226 590.11 228.576 568.77 222.366C554.04 218.586 529.13 244.036 518 301.366C505.52 367.526 500.67 405.066 490 494.956C505.58 451.676 514.49 414.746 545.45 389.956C554.589 382.551 565.818 378.197 577.56 377.506C628.71 374.806 621.17 446.096 541.95 430.406M541.95 430.426C575.55 436.726 571.27 458.036 580.75 482.326C582.111 485.913 584.445 489.051 587.49 491.386C607.49 506.386 643.49 476.616 654.36 457.216C671.21 432.636 684.24 404.916 697.36 378.486M697.38 378.486C684.12 411.766 675.597 437.196 671.81 454.776C668.54 481.546 675.24 493.636 686.32 496.256C710.7 502.016 756.23 461.896 763.13 431.256C776.37 372.396 862.18 350.556 881.97 419.656M881.97 419.636C862.18 350.536 776.21 372.376 763.13 431.236C759.37 455.676 766.85 473.336 779.67 483.966C786.621 489.63 794.908 493.417 803.74 494.966C818.132 497.496 832.957 495.178 845.89 488.376C846.69 487.956 847.49 487.516 848.29 487.056C856.441 482.27 863.382 475.672 868.574 467.773C873.765 459.875 877.069 450.887 878.23 441.506C881.09 419.196 888.04 394.656 892.59 378.086M892.59 378.076C885.36 404.426 872.1 449.746 878.77 476.156C880.283 482.292 884.122 487.599 889.475 490.958C894.828 494.316 901.277 495.463 907.46 494.156C925.39 490.256 943.78 472.156 955.09 454.336M714.5 338C714.5 339.933 712.933 341.5 711 341.5C709.067 341.5 707.5 339.933 707.5 338C707.5 336.067 709.067 334.5 711 334.5C712.933 334.5 714.5 336.067 714.5 338Z";
      const { Skia } = importSkia();
      const path = Skia.Path.MakeFromSVGString(skiaLogo)!;
      const bounds = path.computeTightBounds();
      expect(bounds.x).toBeCloseTo(324, 2);
      expect(bounds.y).toBeCloseTo(222, 2);
      expect(bounds.width).toBeCloseTo(631.09, 2);
      expect(bounds.height).toBeCloseTo(275.55, 2);
    });
  });
});
