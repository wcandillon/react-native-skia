import type { CanvasKit } from "canvaskit-wasm";

import type { PathCommand, PathOp, SkFont, SkPath } from "../types";
import type { PathFactory } from "../types/Path/PathFactory";

import { Host, ckEnum, NotImplementedOnRNWeb } from "./Host";
import { JsiSkPath } from "./JsiSkPath";

export class JsiSkPathFactory extends Host implements PathFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  Make() {
    return new JsiSkPath(this.CanvasKit, new this.CanvasKit.Path());
  }

  MakeFromSVGString(str: string) {
    const path = this.CanvasKit.Path.MakeFromSVGString(str);
    if (path === null) {
      return null;
    }
    return new JsiSkPath(this.CanvasKit, path);
  }

  MakeFromOp(one: SkPath, two: SkPath, op: PathOp) {
    const path = this.CanvasKit.Path.MakeFromOp(
      JsiSkPath.fromValue(one),
      JsiSkPath.fromValue(two),
      ckEnum(op)
    );
    if (path === null) {
      return null;
    }
    return new JsiSkPath(this.CanvasKit, path);
  }

  MakeFromCmds(cmds: PathCommand[]) {
    const path = this.CanvasKit.Path.MakeFromCmds(cmds.flat());
    if (path === null) {
      return null;
    }
    return new JsiSkPath(this.CanvasKit, path);
  }

  MakeFromText(
    _text: string,
    _x: number,
    _y: number,
    _font: SkFont
  ): SkPath | null {
    throw new NotImplementedOnRNWeb();
  }
}
