import type { SkJSIInstance } from "../JsiInstance";
import type { Vector } from "../Point";
import type { SkRuntimeEffect, SkRuntimeShaderBuilder } from "../RuntimeEffect";

export const isShader = (obj: SkJSIInstance<string> | null): obj is SkShader =>
  obj !== null && obj.__typename__ === "Shader";

export type SkShader = SkJSIInstance<"Shader">;

export type Uniform =
  number | Vector | Float32Array | readonly Uniform[] | Uniform[];

export interface Uniforms {
  [name: string]: Uniform;
}

const isVector = (obj: unknown): obj is Vector => {
  "worklet";
  // We have an issue to check property existence on JSI backed instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (obj as any).x !== undefined && (obj as any).y !== undefined;
};

function processValue(values: number[], value: Uniform) {
  "worklet";
  if (typeof value === "number") {
    values.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => processValue(values, v));
  } else if (isVector(value)) {
    values.push(value.x, value.y);
  } else if (value instanceof Float32Array) {
    values.push(...value);
  }
}

export const processUniforms = (
  source: SkRuntimeEffect,
  uniforms: Uniforms,
  builder?: SkRuntimeShaderBuilder
) => {
  "worklet";
  const result: number[] = [];
  const uniformsCount = source.getUniformCount();
  for (let i = 0; i < uniformsCount; i++) {
    const name = source.getUniformName(i);
    const value = uniforms[name];
    if (value === undefined) {
      throw new Error(
        `The runtime effect has the uniform value "${name}" declared, but it is missing from the uniforms property of the Runtime effect.`
      );
    }
    if (builder === undefined) {
      processValue(result, value);
    } else {
      const uniformValue: number[] = [];
      processValue(uniformValue, value);
      builder.setUniform(name, uniformValue);
      result.push(...uniformValue);
    }
  }
  return result;
};
