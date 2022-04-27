import type { SkShader } from "../Shader";
import type { SkJSIInstance } from "../JsiInstance";
import type { SkMatrix } from "../Matrix";

export interface SkSLUniform {
  columns: number;
  rows: number;
  /** The index into the uniforms array that this uniform begins. */
  slot: number;
  isInteger: boolean;
}

export interface IRuntimeEffect extends SkJSIInstance<"RuntimeEffect"> {
  /**
   * Returns a shader executed using the given uniform data.
   * @param uniforms
   * @param isOpaque
   * @param localMatrix
   */
  makeShader(
    uniforms: number[],
    isOpaque?: boolean,
    localMatrix?: SkMatrix
  ): SkShader;

  /**
   * Returns a shader executed using the given uniform data and the children as inputs.
   * @param uniforms
   * @param isOpaque
   * @param children
   * @param localMatrix
   */
  makeShaderWithChildren(
    uniforms: number[],
    isOpaque?: boolean,
    children?: SkShader[],
    localMatrix?: SkMatrix
  ): SkShader;

  /**
   * Returns the nth uniform from the effect.
   * @param index
   */
  getUniform(index: number): SkSLUniform;

  /**
   * Returns the number of uniforms in the effect.
   */
  getUniformCount(): number;

  /**
   * Returns the total number of floats across all uniforms on the effect. This is the length
   * of the uniforms array expected by makeShader. For example, an effect with a single float3
   * uniform, would return 1 from `getUniformCount()`, but 3 from `getUniformFloatCount()`.
   */
  getUniformFloatCount(): number;

  /**
   * Returns the name of the nth effect uniform.
   * @param index
   */
  getUniformName(index: number): string;
}
