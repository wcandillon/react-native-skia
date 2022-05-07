import React, { useMemo } from "react";
import type { Color, SkRect } from "@shopify/react-native-skia";
import {
  processColorAsUnitArray,
  Shader,
  Skia,
} from "@shopify/react-native-skia";

interface BilinearGradientProps {
  rect: SkRect;
  colors: readonly [Color, Color, Color, Color];
}

export const BilinearGradient = ({ rect, colors }: BilinearGradientProps) => {
  const processedColors = colors.map((cl) => processColorAsUnitArray(cl, 1));
  const source = useMemo(
    () =>
      Skia.RuntimeEffect.Make(`
        uniform vec4 position;
        uniform vec4 colors[4];

        vec4 main(vec2 pos) {
          vec2 uv = (pos - vec2(position.x, position.y))/vec2(position.z, position.w);
          vec4 colorA = mix(colors[0], colors[1], uv.x);
          vec4 colorB = mix(colors[2], colors[3], uv.x);
          return mix(colorA, colorB, uv.y);
        }`)!,
    []
  );

  return (
    <Shader
      source={source}
      uniforms={{
        position: [rect.x, rect.y, rect.width, rect.height],
        colors: processedColors,
      }}
    />
  );
};
