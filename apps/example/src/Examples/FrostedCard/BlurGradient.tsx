import React from "react";
import type { Matrix4 } from "@shopify/react-native-skia";
import {
  RuntimeShader,
  convertToColumnMajor,
  vec,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-gesture-handler/lib/typescript/handlers/gestures/reanimatedWrapper";
import { useDerivedValue } from "react-native-reanimated";

import { generateShader } from "./Shader";

const source = generateShader();

interface BlurGradientProps {
  matrix: Readonly<SharedValue<Matrix4>>;
}

export const BlurMask = ({ matrix }: BlurGradientProps) => {
  const hUniforms = useDerivedValue(() => {
    return {
      direction: vec(1, 0),
      matrix: convertToColumnMajor(matrix.value),
    };
  });
  const vUniforms = useDerivedValue(() => {
    return {
      direction: vec(0, 1),
      matrix: convertToColumnMajor(matrix.value),
    };
  });
  return (
    <RuntimeShader source={source} uniforms={hUniforms}>
      <RuntimeShader source={source} uniforms={vUniforms} />
    </RuntimeShader>
  );
};
