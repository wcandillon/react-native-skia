import type { SkRuntimeEffect } from "./RuntimeEffect";

export interface RuntimeEffectFactory {
  /**
   * Compiles a RuntimeEffect from the given shader code. Throws an
   * `SkSLCompilationError`, whose `messages` locate each error in the
   * source, when it does not compile.
   * @param sksl - Source code for a shader written in SkSL
   */
  Make: (sksl: string) => SkRuntimeEffect;
}
