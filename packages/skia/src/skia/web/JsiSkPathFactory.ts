import type { CanvasKit } from "canvaskit-wasm";

import type {
  InputRRect,
  PathCommand,
  PathOp,
  SkFont,
  SkPath,
  SkPoint,
  SkRect,
  StrokeOpts,
} from "../types";
import type { PathFactory } from "../types/Path/PathFactory";
import { SkiaDecodeError } from "../types/Errors";

import { Host, getEnum, optEnum, throwNotImplementedOnRNWeb } from "./Host";
import { JsiSkPath } from "./JsiSkPath";
import { JsiSkPoint } from "./JsiSkPoint";
import { JsiSkRect } from "./JsiSkRect";
import { JsiSkRRect } from "./JsiSkRRect";

const pinT = (t: number) => Math.min(Math.max(t, 0), 1);

// The number of values each verb of a PathCommand takes after itself.
const PathVerbArity = [2, 2, 4, 5, 6, 0];
const PathVerbNames = ["move", "line", "quad", "conic", "cubic", "close"];

// A command that does not fit is a TypeError naming it, as on native.
const validatePathCommands = (cmds: PathCommand[]) => {
  cmds.forEach((cmd, i) => {
    if (cmd.length < 1) {
      throw new TypeError(`MakeFromCmds: command ${i} is an empty array`);
    }
    const verb = cmd[0];
    const arity = PathVerbArity[verb];
    if (arity === undefined) {
      throw new TypeError(
        `MakeFromCmds: command ${i} has an unknown verb ${verb}`
      );
    }
    if (cmd.length < arity + 1) {
      throw new TypeError(
        `MakeFromCmds: command ${i} (${PathVerbNames[verb]}) needs ${arity} numbers, got ${cmd.length - 1}`
      );
    }
  });
};

export class JsiSkPathFactory extends Host implements PathFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  Make() {
    return new JsiSkPath(this.CanvasKit, new this.CanvasKit.PathBuilder());
  }

  MakeFromSVGString(str: string) {
    const path = this.CanvasKit.Path.MakeFromSVGString(str);
    if (path === null) {
      throw new SkiaDecodeError(
        `MakeFromSVGString: invalid SVG path string "${
          str.length > 64 ? str.slice(0, 64) + "..." : str
        }"`,
        "path"
      );
    }
    const result = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(path)
    );
    path.delete();
    return result;
  }

  MakeFromOp(one: SkPath, two: SkPath, op: PathOp) {
    const p1 =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        one
      ).snapshot();
    const p2 =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        two
      ).snapshot();
    const path = this.CanvasKit.Path.MakeFromOp(
      p1,
      p2,
      getEnum(this.CanvasKit, "PathOp", op)
    );
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

  MakeFromCmds(cmds: PathCommand[]) {
    validatePathCommands(cmds);
    const path = this.CanvasKit.Path.MakeFromCmds(cmds.flat());
    if (path === null) {
      throw new TypeError("MakeFromCmds: invalid path commands");
    }
    const result = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(path)
    );
    path.delete();
    return result;
  }

  MakeFromText(_text: string, _x: number, _y: number, _font: SkFont) {
    return throwNotImplementedOnRNWeb<SkPath>();
  }

  // Static shape factories

  Rect(rect: SkRect, isCCW?: boolean) {
    const builder = new this.CanvasKit.PathBuilder();
    builder.addRect(JsiSkRect.fromValue(this.CanvasKit, rect), isCCW);
    return new JsiSkPath(this.CanvasKit, builder);
  }

  Oval(rect: SkRect, isCCW?: boolean, startIndex?: number) {
    const builder = new this.CanvasKit.PathBuilder();
    builder.addOval(
      JsiSkRect.fromValue(this.CanvasKit, rect),
      isCCW,
      startIndex
    );
    return new JsiSkPath(this.CanvasKit, builder);
  }

  Circle(x: number, y: number, r: number) {
    const builder = new this.CanvasKit.PathBuilder();
    builder.addCircle(x, y, r);
    return new JsiSkPath(this.CanvasKit, builder);
  }

  RRect(rrect: InputRRect, isCCW?: boolean) {
    const builder = new this.CanvasKit.PathBuilder();
    builder.addRRect(JsiSkRRect.fromValue(this.CanvasKit, rrect), isCCW);
    return new JsiSkPath(this.CanvasKit, builder);
  }

  Line(p1: SkPoint, p2: SkPoint) {
    const builder = new this.CanvasKit.PathBuilder();
    const pt1 = JsiSkPoint.fromValue(p1);
    const pt2 = JsiSkPoint.fromValue(p2);
    builder.moveTo(pt1[0], pt1[1]);
    builder.lineTo(pt2[0], pt2[1]);
    return new JsiSkPath(this.CanvasKit, builder);
  }

  Polygon(points: SkPoint[], close: boolean) {
    const builder = new this.CanvasKit.PathBuilder();
    builder.addPolygon(
      points.map((p) => Array.from(JsiSkPoint.fromValue(p))).flat(),
      close
    );
    return new JsiSkPath(this.CanvasKit, builder);
  }

  // Static path operations

  Stroke(srcPath: SkPath, opts?: StrokeOpts) {
    const path =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        srcPath
      ).snapshot();
    const result = path.makeStroked(
      opts === undefined
        ? undefined
        : {
            width: opts.width,
            // eslint-disable-next-line camelcase
            miter_limit: opts.miter_limit,
            precision: opts.precision,
            join: optEnum(this.CanvasKit, "StrokeJoin", opts.join),
            cap: optEnum(this.CanvasKit, "StrokeCap", opts.cap),
          }
    );
    path.delete();
    if (result === null) {
      return null;
    }
    const r = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(result)
    );
    result.delete();
    return r;
  }

  Trim(srcPath: SkPath, start: number, end: number, isComplement: boolean) {
    const startT = pinT(start);
    const stopT = pinT(end);
    const path =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        srcPath
      ).snapshot();
    if (startT <= 0 && stopT >= 1 && !isComplement) {
      const r = new JsiSkPath(
        this.CanvasKit,
        new this.CanvasKit.PathBuilder(path)
      );
      path.delete();
      return r;
    }
    const result = path.makeTrimmed(startT, stopT, isComplement);
    path.delete();
    if (result === null) {
      return null;
    }
    const r = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(result)
    );
    result.delete();
    return r;
  }

  Simplify(srcPath: SkPath) {
    const path =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        srcPath
      ).snapshot();
    const result = path.makeSimplified();
    path.delete();
    if (result === null) {
      return null;
    }
    const r = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(result)
    );
    result.delete();
    return r;
  }

  Dash(srcPath: SkPath, on: number, off: number, phase: number) {
    const path =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        srcPath
      ).snapshot();
    const result = path.makeDashed(on, off, phase);
    path.delete();
    if (result === null) {
      return null;
    }
    const r = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(result)
    );
    result.delete();
    return r;
  }

  AsWinding(srcPath: SkPath) {
    const path =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        srcPath
      ).snapshot();
    const result = path.makeAsWinding();
    path.delete();
    if (result === null) {
      return null;
    }
    const r = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(result)
    );
    result.delete();
    return r;
  }

  Interpolate(start: SkPath, end: SkPath, weight: number) {
    const p1 =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        start
      ).snapshot();
    const p2 =
      JsiSkPath.fromValue<CanvasKit["PathBuilder"]["prototype"]>(
        end
      ).snapshot();
    const path = this.CanvasKit.Path.MakeFromPathInterpolation(p1, p2, weight);
    p1.delete();
    p2.delete();
    if (path === null) {
      return null;
    }
    const r = new JsiSkPath(
      this.CanvasKit,
      new this.CanvasKit.PathBuilder(path)
    );
    path.delete();
    return r;
  }
}
