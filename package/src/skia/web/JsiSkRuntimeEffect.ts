import type { CanvasKit, RuntimeEffect } from "canvaskit-wasm";

import type { SkMatrix, SkShader } from "../types";
import type { SkRuntimeEffect } from "../types/RuntimeEffect/RuntimeEffect";

import { HostObject } from "./Host";
import { JsiSkMatrix } from "./JsiSkMatrix";
import { JsiSkShader } from "./JsiSkShader";

export class JsiSkRuntimeEffect
  extends HostObject<RuntimeEffect, "RuntimeEffect">
  implements SkRuntimeEffect
{
  constructor(CanvasKit: CanvasKit, ref: RuntimeEffect) {
    super(CanvasKit, ref, "RuntimeEffect");
  }

  makeShader(uniforms: number[], localMatrix?: SkMatrix) {
    return new JsiSkShader(
      this.CanvasKit,
      this.ref.makeShader(
        uniforms,
        localMatrix !== undefined
          ? JsiSkMatrix.fromValue(localMatrix)
          : localMatrix
      )
    );
  }

  makeShaderWithChildren(
    uniforms: number[],
    children?: SkShader[],
    localMatrix?: SkMatrix
  ) {
    return new JsiSkShader(
      this.CanvasKit,
      this.ref.makeShaderWithChildren(
        uniforms,
        children?.map((child) => JsiSkShader.fromValue(child)),
        localMatrix !== undefined
          ? JsiSkMatrix.fromValue(localMatrix)
          : localMatrix
      )
    );
  }

  getUniform(index: number) {
    return this.ref.getUniform(index);
  }

  getUniformCount() {
    return this.ref.getUniformCount();
  }

  getUniformFloatCount() {
    return this.ref.getUniformFloatCount();
  }

  getUniformName(index: number) {
    return this.ref.getUniformName(index);
  }
}
