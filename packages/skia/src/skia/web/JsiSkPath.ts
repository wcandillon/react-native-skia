import type { CanvasKit, Matrix3x3, Path } from "canvaskit-wasm";

import { PathVerb } from "../types";
import type {
  FillType,
  PathCommand,
  PathOp,
  SkMatrix,
  SkPath,
  SkPoint,
  SkRect,
  InputRRect,
  StrokeOpts,
  InputMatrix,
} from "../types";

import { getEnum, HostObject, optEnum } from "./Host";
import { JsiSkPoint } from "./JsiSkPoint";
import { JsiSkRect } from "./JsiSkRect";
import { JsiSkRRect } from "./JsiSkRRect";
import { JsiSkMatrix } from "./JsiSkMatrix";

const CommandCount = {
  [PathVerb.Move]: 3,
  [PathVerb.Line]: 3,
  [PathVerb.Quad]: 5,
  [PathVerb.Conic]: 6,
  [PathVerb.Cubic]: 7,
  [PathVerb.Close]: 1,
};

const pinT = (t: number) => Math.min(Math.max(t, 0), 1);

export class JsiSkPath extends HostObject<Path, "Path"> implements SkPath {
  constructor(CanvasKit: CanvasKit, ref: Path) {
    super(CanvasKit, ref, "Path");
  }

  dispose = () => {
    this.ref.delete();
  };

  addPath(src: SkPath, matrix?: SkMatrix, extend = false) {
    const args = [
      JsiSkPath.fromValue(src),
      ...(matrix ? JsiSkMatrix.fromValue<Float32Array>(matrix) : []),
      extend,
    ];
    this.ref.addPath(...args);
    return this;
  }

  addArc(
    oval: SkRect,
    startAngleInDegrees: number,
    sweepAngleInDegrees: number
  ) {
    this.ref.addArc(
      JsiSkRect.fromValue(this.CanvasKit, oval),
      startAngleInDegrees,
      sweepAngleInDegrees
    );
    return this;
  }

  addOval(oval: SkRect, isCCW?: boolean, startIndex?: number) {
    this.ref.addOval(
      JsiSkRect.fromValue(this.CanvasKit, oval),
      isCCW,
      startIndex
    );
    return this;
  }

  countPoints() {
    return this.ref.countPoints();
  }

  addPoly(points: SkPoint[], close: boolean) {
    this.ref.addPoly(
      points.map((p) => Array.from(JsiSkPoint.fromValue(p))).flat(),
      close
    );
    return this;
  }

  moveTo(x: number, y: number) {
    this.ref.moveTo(x, y);
    return this;
  }

  lineTo(x: number, y: number) {
    this.ref.lineTo(x, y);
    return this;
  }

  makeAsWinding() {
    const result = this.ref.makeAsWinding();
    return result === null ? result : this;
  }

  offset(dx: number, dy: number) {
    this.ref.offset(dx, dy);
    return this;
  }

  rArcTo(
    rx: number,
    ry: number,
    xAxisRotateInDegrees: number,
    useSmallArc: boolean,
    isCCW: boolean,
    dx: number,
    dy: number
  ) {
    this.ref.rArcTo(rx, ry, xAxisRotateInDegrees, useSmallArc, isCCW, dx, dy);
    return this;
  }

  rConicTo(dx1: number, dy1: number, dx2: number, dy2: number, w: number) {
    this.ref.rConicTo(dx1, dy1, dx2, dy2, w);
    return this;
  }

  rCubicTo(
    cpx1: number,
    cpy1: number,
    cpx2: number,
    cpy2: number,
    x: number,
    y: number
  ) {
    this.ref.rCubicTo(cpx1, cpy1, cpx2, cpy2, x, y);
    return this;
  }

  rMoveTo(x: number, y: number) {
    this.ref.rMoveTo(x, y);
    return this;
  }

  rLineTo(x: number, y: number) {
    this.ref.rLineTo(x, y);
    return this;
  }

  rQuadTo(x1: number, y1: number, x2: number, y2: number) {
    this.ref.rQuadTo(x1, y1, x2, y2);
    return this;
  }

  setFillType(fill: FillType) {
    this.ref.setFillType(getEnum(this.CanvasKit, "FillType", fill));
    return this;
  }

  setIsVolatile(volatile: boolean) {
    this.ref.setIsVolatile(volatile);
    return this;
  }

  stroke(opts?: StrokeOpts) {
    const result = this.ref.stroke(
      opts === undefined
        ? undefined
        : {
            width: opts.width,
            // eslint-disable-next-line camelcase
            miter_limit: opts.width,
            precision: opts.width,
            join: optEnum(this.CanvasKit, "StrokeJoin", opts.join),
            cap: optEnum(this.CanvasKit, "StrokeCap", opts.cap),
          }
    );
    return result === null ? result : this;
  }

  close() {
    this.ref.close();
    return this;
  }

  reset() {
    this.ref.reset();
    return this;
  }

  rewind() {
    this.ref.rewind();
    return this;
  }

  computeTightBounds(): SkRect {
    return new JsiSkRect(this.CanvasKit, this.ref.computeTightBounds());
  }

  arcToOval(
    oval: SkRect,
    startAngleInDegrees: number,
    sweepAngleInDegrees: number,
    forceMoveTo: boolean
  ) {
    this.ref.arcToOval(
      JsiSkRect.fromValue(this.CanvasKit, oval),
      startAngleInDegrees,
      sweepAngleInDegrees,
      forceMoveTo
    );
    return this;
  }

  arcToRotated(
    rx: number,
    ry: number,
    xAxisRotateInDegrees: number,
    useSmallArc: boolean,
    isCCW: boolean,
    x: number,
    y: number
  ) {
    this.ref.arcToRotated(
      rx,
      ry,
      xAxisRotateInDegrees,
      useSmallArc,
      isCCW,
      x,
      y
    );
    return this;
  }

  arcToTangent(x1: number, y1: number, x2: number, y2: number, radius: number) {
    this.ref.arcToTangent(x1, y1, x2, y2, radius);
    return this;
  }

  conicTo(x1: number, y1: number, x2: number, y2: number, w: number) {
    this.ref.conicTo(x1, y1, x2, y2, w);
    return this;
  }

  contains(x: number, y: number) {
    return this.ref.contains(x, y);
  }

  copy() {
    return new JsiSkPath(this.CanvasKit, this.ref.copy());
  }

  cubicTo(
    cpx1: number,
    cpy1: number,
    cpx2: number,
    cpy2: number,
    x: number,
    y: number
  ) {
    this.ref.cubicTo(cpx1, cpy1, cpx2, cpy2, x, y);
    return this;
  }

  dash(on: number, off: number, phase: number) {
    return this.ref.dash(on, off, phase);
  }

  equals(other: SkPath) {
    return this.ref.equals(JsiSkPath.fromValue(other));
  }

  getBounds() {
    return new JsiSkRect(this.CanvasKit, this.ref.getBounds());
  }

  getFillType() {
    return this.ref.getFillType().value;
  }

  quadTo(x1: number, y1: number, x2: number, y2: number) {
    this.ref.quadTo(x1, y1, x2, y2);
    return this;
  }

  addRect(rect: SkRect, isCCW?: boolean) {
    this.ref.addRect(JsiSkRect.fromValue(this.CanvasKit, rect), isCCW);
    return this;
  }

  addRRect(rrect: InputRRect, isCCW?: boolean) {
    this.ref.addRRect(JsiSkRRect.fromValue(this.CanvasKit, rrect), isCCW);
    return this;
  }

  getPoint(index: number) {
    return new JsiSkPoint(this.CanvasKit, this.ref.getPoint(index));
  }

  isEmpty() {
    return this.ref.isEmpty();
  }

  isVolatile() {
    return this.ref.isVolatile();
  }

  addCircle(x: number, y: number, r: number) {
    this.ref.addCircle(x, y, r);
    return this;
  }

  getLastPt() {
    return new JsiSkPoint(
      this.CanvasKit,
      this.ref.getPoint(this.ref.countPoints() - 1)
    );
  }

  op(path: SkPath, op: PathOp) {
    return this.ref.op(
      JsiSkPath.fromValue(path),
      getEnum(this.CanvasKit, "PathOp", op)
    );
  }

  simplify() {
    return this.ref.simplify();
  }

  toSVGString() {
    return this.ref.toSVGString();
  }

  trim(start: number, stop: number, isComplement: boolean) {
    const startT = pinT(start);
    const stopT = pinT(stop);
    if (startT === 0 && stopT === 1) {
      return this;
    }
    const result = this.ref.trim(startT, stopT, isComplement);
    return result === null ? result : this;
  }

  transform(m: InputMatrix) {
    let matrix =
      m instanceof JsiSkMatrix
        ? Array.from(JsiSkMatrix.fromValue<Matrix3x3>(m))
        : (m as Exclude<InputMatrix, SkMatrix>);
    if (matrix.length === 16) {
      matrix = [
        matrix[0],
        matrix[1],
        matrix[3],
        matrix[4],
        matrix[5],
        matrix[7],
        matrix[12],
        matrix[13],
        matrix[15],
      ];
    } else if (matrix.length !== 9) {
      throw new Error(`Invalid matrix length: ${matrix.length}`);
    }
    this.ref.transform(matrix);
    return this;
  }

  interpolate(end: SkPath, t: number, output?: SkPath) {
    const path = this.CanvasKit.Path.MakeFromPathInterpolation(
      this.ref,
      JsiSkPath.fromValue(end),
      t
    );
    if (path === null) {
      return null;
    }
    if (output) {
      (output as JsiSkPath).ref = path;
      return output;
    } else {
      return new JsiSkPath(this.CanvasKit, path);
    }
  }

  isInterpolatable(path2: SkPath): boolean {
    return this.CanvasKit.Path.CanInterpolate(
      this.ref,
      JsiSkPath.fromValue(path2)
    );
  }

  toCmds() {
    const cmds = this.ref.toCmds();
    const result = cmds.reduce<PathCommand[]>((acc, cmd, i) => {
      if (i === 0) {
        acc.push([]);
      }
      const current = acc[acc.length - 1];
      if (current.length === 0) {
        current.push(cmd);
        const length = CommandCount[current[0] as PathVerb];
        if (current.length === length && i !== cmds.length - 1) {
          acc.push([]);
        }
      } else {
        const length = CommandCount[current[0] as PathVerb];
        if (current.length < length) {
          current.push(cmd);
        }
        if (current.length === length && i !== cmds.length - 1) {
          acc.push([]);
        }
      }
      return acc;
    }, []);
    return result;
  }
}
