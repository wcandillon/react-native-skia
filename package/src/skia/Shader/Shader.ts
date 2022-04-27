import type { SkJSIInstance } from "../JsiInstance";

export const isShader = (obj: SkJSIInstance<string> | null): obj is SkShader =>
  obj !== null && obj.__typename__ === "Shader";

export type SkShader = SkJSIInstance<"Shader">;
