import React from "react";
import type { SkRect, Color } from "@shopify/react-native-skia";
import { Shader, Skia } from "@shopify/react-native-skia";

const source = Skia.RuntimeEffect.Make(`
uniform vec4 position;
uniform vec4 colors[4];

vec4 main(vec2 pos) {
  vec2 uv = (pos - vec2(position.x, position.y))/vec2(position.z, position.w);
  vec4 colorA = mix(colors[0], colors[1], uv.x);
  vec4 colorB = mix(colors[2], colors[3], uv.x);
  return mix(colorA, colorB, uv.y);
}`)!;

interface BilinearGradientProps {
  rect: SkRect;
  colors: [Color, Color, Color, Color];
}

export const BilinearGradient = ({ rect, colors }: BilinearGradientProps) => {
  return (
    <Shader
      source={source}
      uniforms={{
        position: [rect.x, rect.y, rect.width, rect.height],
        colors: colors.map(Skia.Color).map(([r, g, b, a]) => [r, g, b, a]),
      }}
    />
  );
};
