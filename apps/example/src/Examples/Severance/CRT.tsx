import {
  Group,
  Skia,
  RuntimeShader,
  Paint,
  vec,
} from "@shopify/react-native-skia";
import type { ReactNode } from "react";
import React from "react";
import { useWindowDimensions } from "react-native";

const source = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform vec2 resolution;

vec2 curve(vec2 uv)
{
    // as we near the edge of our screen apply greater distortion using a sinusoid.
    float curvature = 6.0;
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs(uv.yx) / curvature;
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

vec4 scanLine(float x)
{
    float f = 900;
    float opacity = 0.25;
    float intensity = ((0.5 * sin(x * f)) + 0.5) * 0.9 + 0.1;
    return vec4(vec3(pow(intensity, opacity)), 1.0);
}

half4 main(float2 xy) {
  vec2 uv = xy/resolution;

  vec2 curvedUV = curve(vec2(uv.x, uv.y));
  vec4 baseColor = image.eval(curvedUV * resolution);


  baseColor *= scanLine(curvedUV.x);
  baseColor *= scanLine(curvedUV.y);

  baseColor *= vec4(vec3(1.5), 1.0);

  if (curvedUV.x < 0.0 || curvedUV.y < 0.0 || curvedUV.x > 1.0 || curvedUV.y > 1.0){
      return vec4(0.0, 0.0, 0.0, 1.0);
  } else {
      return baseColor;
  }
}
`)!;

interface CRTProps {
  children: ReactNode | ReactNode[];
}

export const CRT = ({ children }: CRTProps) => {
  const { width, height } = useWindowDimensions();
  return (
    <Group
      layer={
        <Paint>
          <RuntimeShader
            source={source}
            uniforms={{ resolution: vec(width, height) }}
          />
        </Paint>
      }
    >
      {children}
    </Group>
  );
};
