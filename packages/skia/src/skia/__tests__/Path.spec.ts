/* eslint-disable max-len */
import { interpolatePaths } from "../../animation/functions/interpolatePaths";
import type { Skia, SkPath } from "../types";
import { FillType, PathOp, PathVerb } from "../types";
import { processResult } from "../../__tests__/setup";
import { PaintStyle } from "../types/Paint/Paint";

import { setupSkia } from "./setup";

const roundtrip = (Skia: Skia, path: SkPath) =>
  Skia.Path.MakeFromCmds(path.toCmds())!;

describe("Path", () => {
  it("React logo", () => {
    const { surface, canvas, Skia } = setupSkia();
    const svg1 =
      "M150.817 113.884C150.817 126.485 140.602 136.701 128 136.701C115.398 136.701 105.183 126.485 105.183 113.884C105.183 101.282 115.398 91.0663 128 91.0663C140.602 91.0663 150.817 101.282 150.817 113.884Z";
    const svg2 =
      "M128 191.877C104.213 216.339 80.8869 228.058 66.7826 219.915C52.6783 211.772 51.1647 185.712 60.4559 152.88C27.3773 144.511 5.56522 130.17 5.56522 113.884C5.56522 97.5975 27.3773 83.2565 60.4559 74.8871C51.1647 42.0555 52.6783 15.9952 66.7826 7.85209C80.8869 -0.291009 104.213 11.4283 128 35.8905C151.787 11.4283 175.113 -0.291018 189.217 7.85208C203.322 15.9952 204.835 42.0555 195.544 74.8871C228.623 83.2565 250.435 97.5975 250.435 113.884C250.435 130.17 228.623 144.511 195.544 152.88C204.835 185.712 203.322 211.772 189.217 219.915C175.113 228.058 151.787 216.339 128 191.877ZM71.7826 211.255C69.497 209.936 67.0111 206.926 65.6137 200.393C64.2166 193.861 64.1969 184.917 65.9598 173.914C66.9004 168.042 68.3234 161.739 70.2187 155.109C79.9755 157.106 90.5237 158.614 101.637 159.545C108.001 168.704 114.58 177.085 121.189 184.536C116.395 189.493 111.647 193.877 107.033 197.627C98.385 204.655 90.6292 209.111 84.2739 211.167C77.9172 213.223 74.0682 212.575 71.7826 211.255ZM185.781 72.6589C187.677 66.0285 189.1 59.7251 190.04 53.8539C191.803 42.8506 191.783 33.9062 190.386 27.3744C188.989 20.8411 186.503 17.8319 184.217 16.5123C181.932 15.1928 178.083 14.5444 171.726 16.6009C165.371 18.6569 157.615 23.112 148.967 30.1404C144.353 33.8906 139.605 38.2747 134.811 43.2312C141.42 50.6819 147.999 59.0631 154.363 68.2223C165.476 69.1534 176.025 70.6611 185.781 72.6589ZM121.189 43.2312C116.395 38.2747 111.647 33.8906 107.033 30.1404C98.385 23.112 90.6292 18.6569 84.2739 16.6009C77.9172 14.5445 74.0682 15.1928 71.7826 16.5123C69.497 17.8319 67.0111 20.8411 65.6137 27.3744C64.2166 33.9062 64.1969 42.8506 65.9598 53.8539C66.9004 59.7251 68.3234 66.0286 70.2187 72.6589C79.9755 70.6611 90.5237 69.1534 101.637 68.2223C108.001 59.0631 114.58 50.682 121.189 43.2312ZM114.51 67.4164C118.965 61.3763 123.485 55.7626 128 50.6258C132.515 55.7626 137.035 61.3763 141.49 67.4164C137.06 67.231 132.559 67.1359 128 67.1359C123.441 67.1359 118.94 67.231 114.51 67.4164ZM94.503 78.9676C87.0448 79.8054 79.9231 80.9132 73.2171 82.2548C75.4082 88.7331 78.0097 95.4546 81.0133 102.333C83.0676 98.4035 85.2357 94.4581 87.5152 90.5098C89.7947 86.5615 92.1276 82.7112 94.503 78.9676ZM86.3696 113.884C89.3439 107.821 92.6143 101.678 96.1754 95.5098C99.7366 89.3416 103.422 83.4378 107.185 77.8307C113.922 77.3752 120.878 77.1359 128 77.1359C135.122 77.1359 142.078 77.3752 148.815 77.8307C152.578 83.4378 156.263 89.3416 159.825 95.5098C163.386 101.678 166.656 107.821 169.63 113.884C166.656 119.946 163.386 126.089 159.825 132.258C156.263 138.426 152.578 144.33 148.815 149.937C142.078 150.392 135.122 150.632 128 150.632C120.878 150.632 113.922 150.392 107.185 149.937C103.422 144.33 99.7366 138.426 96.1754 132.258C92.6143 126.089 89.3439 119.946 86.3696 113.884ZM75.2747 113.884C70.5243 103.793 66.5558 93.9046 63.4076 84.4561C56.7179 86.1298 50.5474 88.0492 44.9926 90.1702C34.5819 94.1452 26.8457 98.6344 21.8875 103.11C16.9283 107.587 15.5652 111.245 15.5652 113.884C15.5652 116.523 16.9283 120.18 21.8875 124.657C26.8457 129.133 34.5819 133.622 44.9926 137.597C50.5474 139.718 56.7179 141.638 63.4076 143.311C66.5558 133.863 70.5243 123.974 75.2747 113.884ZM73.2171 145.513C75.4082 139.034 78.0097 132.313 81.0133 125.435C83.0676 129.364 85.2357 133.309 87.5152 137.258C89.7947 141.206 92.1276 145.056 94.503 148.8C87.0448 147.962 79.9231 146.854 73.2171 145.513ZM154.363 159.545C165.476 158.614 176.024 157.106 185.781 155.109C187.677 161.739 189.1 168.042 190.04 173.914C191.803 184.917 191.783 193.861 190.386 200.393C188.989 206.926 186.503 209.936 184.217 211.255C181.932 212.575 178.083 213.223 171.726 211.167C165.371 209.111 157.615 204.655 148.967 197.627C144.353 193.877 139.605 189.493 134.811 184.536C141.42 177.085 147.999 168.704 154.363 159.545ZM141.49 160.351C137.035 166.391 132.515 172.005 128 177.142C123.485 172.005 118.965 166.391 114.51 160.351C118.94 160.536 123.441 160.632 128 160.632C132.559 160.632 137.06 160.536 141.49 160.351ZM161.497 148.8C163.872 145.056 166.205 141.206 168.485 137.258C170.764 133.309 172.932 129.364 174.987 125.435C177.99 132.313 180.592 139.034 182.783 145.513C176.077 146.854 168.955 147.962 161.497 148.8ZM180.725 113.884C185.476 123.974 189.444 133.863 192.592 143.311C199.282 141.638 205.453 139.718 211.007 137.597C221.418 133.622 229.154 129.133 234.112 124.657C239.072 120.18 240.435 116.523 240.435 113.884C240.435 111.245 239.072 107.587 234.112 103.11C229.154 98.6344 221.418 94.1452 211.007 90.1702C205.453 88.0492 199.282 86.1298 192.592 84.4561C189.444 93.9046 185.476 103.793 180.725 113.884ZM174.987 102.333C177.99 95.4546 180.592 88.7331 182.783 82.2548C176.077 80.9132 168.955 79.8054 161.497 78.9676C163.872 82.7112 166.205 86.5615 168.485 90.5098C170.764 94.4581 172.932 98.4035 174.987 102.333Z";
    const p1 = roundtrip(Skia, Skia.Path.MakeFromSVGString(svg1)!);
    expect(p1.toSVGString()).toBeApproximatelyEqual(svg1);

    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color("cyan"));
    canvas.drawPath(p1, paint);
    const p2 = roundtrip(Skia, Skia.Path.MakeFromSVGString(svg2)!);
    expect(p2.toSVGString()).toBeApproximatelyEqual(svg2);

    p2.setFillType(FillType.EvenOdd);
    canvas.drawPath(p2, paint);
    const cmds1 = p1.toCmds();
    expect(cmds1).toEqual(Skia.Path.MakeFromCmds(cmds1)?.toCmds());
    processResult(surface, "snapshots/path/logo.png");
  });

  it("Should test that path are interpolatable as specificed in fiddle", () => {
    // https://fiddle.skia.org/c/@Path_isInterpolatable
    const { Skia } = setupSkia();
    const path = Skia.Path.Make();
    const path2 = Skia.Path.Make();
    path.moveTo(20, 20);
    path.lineTo(40, 40);
    path.lineTo(20, 20);
    path.lineTo(40, 40);
    path.close();
    path2.addRect(Skia.XYWHRect(20, 20, 20, 20));
    expect(path.isInterpolatable(path2)).toBe(true);
  });

  it("Should test that path interpolation works as specified in the Skia test suite", () => {
    // https://github.com/google/skia/blob/1f193df9b393d50da39570dab77a0bb5d28ec8ef/tests/PathTest.cpp
    const { Skia } = setupSkia();
    const p1 = Skia.Path.Make();
    const p2 = Skia.Path.Make();
    let p3: SkPath;
    expect(p1.isInterpolatable(p2)).toBe(true);
    p3 = p1.interpolate(p2, 0)!;
    expect(p3).toBeTruthy();
    expect(p1.toCmds()).toEqual(p3.toCmds());
    p3 = p1.interpolate(p2, 1)!;
    expect(p3).toBeTruthy();
    expect(p2.toCmds()).toEqual(p3.toCmds());
    p1.moveTo(0, 2);
    p1.lineTo(0, 4);
    expect(p1.isInterpolatable(p2)).toBe(false);
    expect(p1.interpolate(p2, 1)).toBeNull();
    p2.moveTo(6, 0);
    p2.lineTo(8, 0);
    expect(p1.isInterpolatable(p2)).toBe(true);
    p3 = p1.interpolate(p2, 0)!;
    expect(p3).toBeTruthy();
    expect(p2.toCmds()).toEqual(p3.toCmds());
    p3 = p1.interpolate(p2, 1)!;
    expect(p3).toBeTruthy();
    expect(p1.toCmds()).toEqual(p3.toCmds());
    p3 = p1.interpolate(p2, 0.5)!;
    expect(p3).toBeTruthy();
    let bounds = p3.getBounds();
    let rect = Skia.XYWHRect(3, 1, 1, 1);
    expect([bounds.x, bounds.y, bounds.width, bounds.height]).toEqual([
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    ]);
    p1.reset();
    p1.moveTo(4, 4);
    p1.conicTo(5, 4, 5, 5, 0.2);
    p2.reset();
    p2.moveTo(4, 2);
    p2.conicTo(7, 2, 7, 5, 0.2);
    expect(p1.isInterpolatable(p2)).toBe(true);
    p3 = p1.interpolate(p2, 0.5)!;
    expect(p3).toBeTruthy();
    expect(p3.toCmds()).toEqual([
      [PathVerb.Move, 4, 3],
      [PathVerb.Conic, 6, 3, 6, 5, Math.fround(0.2)],
    ]);
    bounds = p3.getBounds();
    rect = Skia.XYWHRect(4, 3, 2, 2);
    expect([bounds.x, bounds.y, bounds.width, bounds.height]).toEqual([
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    ]);
    p2.reset();
    p2.moveTo(4, 2);
    p2.conicTo(6, 3, 6, 5, 1);
    expect(p1.isInterpolatable(p2)).toBe(false);
    p2.reset();
    p2.moveTo(4, 4);
    p2.conicTo(5, 4, 5, 5, 0.5);
    expect(p1.isInterpolatable(p2)).toBe(false);
  });

  it("Should test that paths can be interpolated", () => {
    const { Skia } = setupSkia();
    const path1 = Skia.Path.Make();
    path1.moveTo(0, 0);
    path1.lineTo(100, 100);
    const path2 = Skia.Path.Make();
    path2.moveTo(100, 100);
    path2.lineTo(0, 0);
    expect(path1.isInterpolatable(path2)).toBe(true);
    path2.lineTo(0, 100);
    expect(path1.isInterpolatable(path2)).toBe(false);
  });

  it("Should interpolate one Path", () => {
    const { Skia } = setupSkia();
    const path1 = Skia.Path.Make();
    path1.moveTo(0, 0);
    path1.lineTo(100, 100);
    const path2 = Skia.Path.Make();
    path2.moveTo(100, 100);
    path2.lineTo(0, 0);
    const path3 = Skia.Path.Make();
    path3.moveTo(50, 50);
    path3.lineTo(50, 50);
    expect(path1.isInterpolatable(path2)).toBe(true);
    const interpolate0 = path1.interpolate(path2, 0)!;
    const interpolate05 = path1.interpolate(path2, 0.5)!;
    const interpolate1 = path1.interpolate(path2, 1)!;

    expect(interpolate0).not.toBeNull();
    expect(interpolate05).not.toBeNull();
    expect(interpolate1).not.toBeNull();

    expect(interpolate0.toCmds().flat()).toEqual(path2.toCmds().flat());
    expect(interpolate05.toCmds().flat()).toEqual(path3.toCmds().flat());
    expect(interpolate1.toCmds().flat()).toEqual(path1.toCmds().flat());
  });

  it("Should interpolate more than one Path", () => {
    const { Skia } = setupSkia();
    const path1 = Skia.Path.Make();
    path1.moveTo(0, 0);
    path1.lineTo(100, 100);
    const path2 = Skia.Path.Make();
    path2.moveTo(100, 100);
    path2.lineTo(0, 0);
    const path3 = Skia.Path.Make();
    path3.moveTo(0, 0);
    path3.lineTo(200, 200);
    expect(path1.isInterpolatable(path2)).toBe(true);
    expect(path2.isInterpolatable(path3)).toBe(true);
    let path = interpolatePaths(0, [0, 0.5, 1], [path1, path2, path3]);
    expect(path.toCmds().flat()).toEqual(path1.toCmds().flat());
    path = interpolatePaths(0.5, [0, 0.5, 1], [path1, path2, path3]);
    expect(path.toCmds().flat()).toEqual(path2.toCmds().flat());
    path = interpolatePaths(1, [0, 0.5, 1], [path1, path2, path3]);
    expect(path.toCmds().flat()).toEqual(path3.toCmds().flat());
  });

  it("Should interpolate more than one path and clamp on the left side", () => {
    const { Skia } = setupSkia();
    const path1 = Skia.Path.Make();
    path1.moveTo(0, 0);
    path1.lineTo(100, 100);
    const path2 = Skia.Path.Make();
    path2.moveTo(100, 100);
    path2.lineTo(0, 0);
    const path3 = Skia.Path.Make();
    path3.moveTo(0, 0);
    path3.lineTo(200, 200);
    const path = interpolatePaths(
      -1,
      [0, 0.5, 1],
      [path1, path2, path3],
      "clamp"
    );
    expect(path.toCmds().flat()).toEqual(path1.toCmds().flat());
  });

  it("Should interpolate more than one path and clamp on the right side", () => {
    const { Skia } = setupSkia();
    const path1 = Skia.Path.Make();
    path1.moveTo(0, 0);
    path1.lineTo(100, 100);
    const path2 = Skia.Path.Make();
    path2.moveTo(100, 100);
    path2.lineTo(0, 0);
    const path3 = Skia.Path.Make();
    path3.moveTo(0, 0);
    path3.lineTo(200, 200);
    const path = interpolatePaths(
      2,
      [0, 0.5, 1],
      [path1, path2, path3],
      "clamp"
    );
    expect(path.toCmds()).toEqual(path3.toCmds());
  });

  it("Should match construct a path from commands", () => {
    const { Skia } = setupSkia();
    const cmds = [
      [PathVerb.Move, 205, 5],
      [PathVerb.Line, 795, 5],
      [PathVerb.Line, 595, 295],
      [PathVerb.Line, 5, 295],
      [PathVerb.Line, 205, 5],
      [PathVerb.Close],
    ];
    const path = Skia.Path.MakeFromCmds(cmds)!;
    expect(path).toBeTruthy();
    const svgStr = path.toSVGString();
    // We output it in terse form, which is different than Wikipedia's version
    expect(svgStr).toEqual("M205 5L795 5L595 295L5 295L205 5Z");
  });

  it("Should serialize a path to commands", () => {
    const { Skia } = setupSkia();
    const path = Skia.Path.MakeFromSVGString(
      "M 205,5 L 795,5 L 595,295 L 5,295 L 205,5 z"
    )!;
    const cmds = path.toCmds();
    expect(cmds).toBeTruthy();
    // 1 move, 4 lines, 1 close
    // each element in cmds is an array, with index 0 being the verb, and the rest being args
    expect(cmds.length).toBe(6);
    expect(cmds).toEqual([
      [PathVerb.Move, 205, 5],
      [PathVerb.Line, 795, 5],
      [PathVerb.Line, 595, 295],
      [PathVerb.Line, 5, 295],
      [PathVerb.Line, 205, 5],
      [PathVerb.Close],
    ]);
  });

  it("should create a path by combining two other paths", () => {
    const { Skia } = setupSkia();
    // Get the intersection of two overlapping squares and verify that it is the smaller square.
    const pathOne = Skia.Path.Make();
    pathOne.addRect(Skia.XYWHRect(0, 0, 100, 100));

    const pathTwo = Skia.Path.Make();
    pathTwo.addRect(Skia.XYWHRect(50, 50, 50, 50));

    const path = Skia.Path.MakeFromOp(pathOne, pathTwo, PathOp.Intersect)!;
    expect(path).not.toBeNull();
    const cmds = path.toCmds();
    expect(cmds).toBeTruthy();
    expect(cmds).toEqual([
      [PathVerb.Move, 50, 50],
      [PathVerb.Line, 100, 50],
      [PathVerb.Line, 100, 100],
      [PathVerb.Line, 50, 100],
      [PathVerb.Close],
    ]);
  });

  it("should create an SVG string from a path", () => {
    const { Skia } = setupSkia();
    const cmds = [
      [PathVerb.Move, 205, 5],
      [PathVerb.Line, 795, 5],
      [PathVerb.Line, 595, 295],
      [PathVerb.Line, 5, 295],
      [PathVerb.Line, 205, 5],
      [PathVerb.Close],
    ];
    const path = Skia.Path.MakeFromCmds(cmds)!;
    expect(path).toBeTruthy();
    // We output it in terse form, which is different than Wikipedia's version
    expect(path.toSVGString()).toEqual("M205 5L795 5L595 295L5 295L205 5Z");
  });

  it("should draw different interpolation states", () => {
    const { Skia, surface, canvas } = setupSkia();
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(PaintStyle.Stroke);
    const path = Skia.Path.Make();
    const path2 = Skia.Path.Make();
    path.moveTo(20, 20);
    path.lineTo(40, 40);
    path.lineTo(20, 40);
    path.lineTo(40, 20);
    path.close();
    path2.addRect(Skia.XYWHRect(20, 20, 20, 20));
    for (let i = 0; i <= 1; i += 1 / 6) {
      const interp = path.interpolate(path2, i)!;
      expect(interp).toBeTruthy();
      canvas.drawPath(interp, paint);
      canvas.translate(30, 0);
    }
    processResult(surface, "snapshots/path/interpolate.png");
  });

  it("should support overshooting values in path interpolation", () => {
    const { Skia } = setupSkia();
    const p1 = Skia.Path.Make();
    p1.moveTo(0, 0);
    p1.lineTo(100, 100);

    const p2 = Skia.Path.Make();
    p2.moveTo(0, 100);
    p2.lineTo(100, 0);

    const p3 = p2.interpolate(p1, 1.1)!;
    expect(p3).not.toBeNull();
    const [[, moveX, moveY], [, lineX, lineY]] = p3.toCmds();
    expect(moveX).toBe(0);
    expect(moveY).toBe(110);
    expect(lineX).toBe(100);
    expect(lineY).toBeCloseTo(-10);

    const p4 = p2.interpolate(p1, -0.1)!;
    expect(p4).not.toBeNull();
    const [[, moveX1, moveY1], [, lineX1, lineY1]] = p4.toCmds();
    expect(moveX1).toBe(0);
    expect(moveY1).toBe(-10);
    expect(lineX1).toBe(100);
    expect(lineY1).toBe(110);
  });

  it("interpolatePath() should support overshooting values", () => {
    const { Skia } = setupSkia();
    const p1 = Skia.Path.Make();
    p1.moveTo(0, 0);
    p1.lineTo(100, 100);

    const p2 = Skia.Path.Make();
    p2.moveTo(0, 100);
    p2.lineTo(100, 0);

    const ref1 = Skia.Path.Make();
    ref1.moveTo(0, -10);
    ref1.lineTo(100, 110);

    const ref2 = Skia.Path.Make();
    ref2.moveTo(0, 110);
    ref2.lineTo(100, -10.000001907348633);

    const p3 = interpolatePaths(-0.1, [0, 1], [p1, p2]);
    expect(p3.toCmds()).toEqual(ref1.toCmds());
    const p4 = interpolatePaths(1.1, [0, 1], [p1, p2]);
    expect(p4.toCmds()).toEqual(ref2.toCmds());
  });

  it("interpolatePath() should support clamping left and right values", () => {
    const { Skia } = setupSkia();
    const p1 = Skia.Path.Make();
    p1.moveTo(0, 0);
    p1.lineTo(100, 100);

    const p2 = Skia.Path.Make();
    p2.moveTo(0, 100);
    p2.lineTo(100, 0);

    const p3 = interpolatePaths(-0.1, [0, 1], [p1, p2], "clamp");
    expect(p3.toCmds()).toEqual(p1.toCmds());
    const p4 = interpolatePaths(1.1, [0, 1], [p1, p2], "clamp");
    expect(p4.toCmds()).toEqual(p2.toCmds());
  });
  it("should be possible to call dispose on a path", () => {
    const { Skia } = setupSkia();
    const path = Skia.Path.Make();
    path.moveTo(20, 20).lineTo(20, 40).lineTo(40, 20);
    path.dispose();
  });
});
