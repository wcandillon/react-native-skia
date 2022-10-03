import React from "react";

import type { SkiaProps } from "../../processors";
import type { ShaderProps } from "../../../dom/types";

export const Shader = (props: SkiaProps<ShaderProps>) => {
  return <skShader {...props} />;
};

Shader.defaultProps = {
  uniforms: [],
};
