import type { CanvasKit, PathBuilder as CKPathBuilder } from "canvaskit-wasm";

import { PathVerb } from "../types";
import type {
  FillType,
  PathCommand,
  SkMatrix,
  SkPath,
  SkPoint,
  SkRect,
  InputMatrix,
} from "../types";

import { HostObject } from "./Host";
import { JsiSkPoint } from "./JsiSkPoint";
import { JsiSkRect } from "./JsiSkRect";
import { JsiSkMatrix } from "./JsiSkMatrix";

const CommandCount = {
  [PathVerb.Move]: 3,
  [PathVerb.Line]: 3,
  [PathVerb.Quad]: 5,
  [PathVerb.Conic]: 6,
  [PathVerb.Cubic]: 7,
  [PathVerb.Close]: 1,
};

export const toMatrix3x3 = (m: InputMatrix): number[] => {
  let matrix =
    m instanceof JsiSkMatrix
      ? Array.from(JsiSkMatrix.fromValue<Float32Array>(m))
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
  return matrix as number[];
};

/**
 * SkPath wraps a CK PathBuilder internally, providing immutable query
 * methods. Use snapshot() internally to get
 * an immutable CK Path for read-only operations.
 */
export class JsiSkPath
  extends HostObject<CKPathBuilder, "Path">
  implements SkPath
{
  constructor(CanvasKit: CanvasKit, ref: CKPathBuilder) {
    super(CanvasKit, ref, "Path");
  }

  /** Returns an immutable CK Path snapshot for read-only operations. */
  private asPath() {
    return this.ref.snapshot();
  }

  /** Extract an immutable CK Path from a JsiSkPath value (for CK interop). */
  static pathFromValue(value: SkPath) {
    return JsiSkPath.fromValue<CKPathBuilder>(value).snapshot();
  }

  // ---- Query methods (use snapshot for read-only) ----

  countPoints() {
    return this.ref.countPoints();
  }

  computeTightBounds(): SkRect {
    const path = this.asPath();
    const result = new JsiSkRect(this.CanvasKit, path.computeTightBounds());
    path.delete();
    return result;
  }

  contains(x: number, y: number) {
    const path = this.asPath();
    const result = path.contains(x, y);
    path.delete();
    return result;
  }

  copy() {
    const path = this.asPath();
    const result = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(path)
    );
    path.delete();
    return result;
  }

  equals(other: SkPath) {
    const p1 = this.asPath();
    const p2 = JsiSkPath.fromValue<CKPathBuilder>(other).snapshot();
    const result = p1.equals(p2);
    p1.delete();
    p2.delete();
    return result;
  }

  getBounds() {
    return new JsiSkRect(this.CanvasKit, this.ref.getBounds());
  }

  getFillType(): FillType {
    const path = this.asPath();
    const result = path.getFillType().value;
    path.delete();
    return result;
  }

  getPoint(index: number): SkPoint {
    const path = this.asPath();
    const result = new JsiSkPoint(this.CanvasKit, path.getPoint(index));
    path.delete();
    return result;
  }

  isEmpty() {
    return this.ref.isEmpty();
  }

  isVolatile() {
    return false;
  }

  getLastPt() {
    const count = this.ref.countPoints();
    if (count === 0) {
      return { x: 0, y: 0 };
    }
    const path = this.asPath();
    const pt = path.getPoint(count - 1);
    path.delete();
    return { x: pt[0], y: pt[1] };
  }

  toSVGString() {
    const path = this.asPath();
    const result = path.toSVGString();
    path.delete();
    return result;
  }

  isInterpolatable(path2: SkPath): boolean {
    const p1 = this.asPath();
    const p2 = JsiSkPath.fromValue<CKPathBuilder>(path2).snapshot();
    const result = this.CanvasKit.Path.CanInterpolate(p1, p2);
    p1.delete();
    p2.delete();
    return result;
  }

  interpolate(end: SkPath, weight: number): SkPath | null {
    const p1 = this.asPath();
    const p2 = JsiSkPath.fromValue<CKPathBuilder>(end).snapshot();
    const path = this.CanvasKit.Path.MakeFromPathInterpolation(p1, p2, weight);
    p1.delete();
    p2.delete();
    if (path === null) {
      return null;
    }
    const result = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(path)
    );
    path.delete();
    return result;
  }

  toCmds() {
    const path = this.asPath();
    const cmds = path.toCmds();
    path.delete();
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
