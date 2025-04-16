import { Shader, Skia } from "@shopify/react-native-skia";
import type { ReactNode } from "react";
import React, { useEffect } from "react";
import {
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const background = Skia.RuntimeEffect.Make(`
uniform float progress;
uniform shader image;
uniform vec2 resolution;


vec3 hueRotation(vec3 color, float angle) {
  const vec3 k = vec3(0.57735, 0.57735, 0.57735);
  float cosAngle = cos(angle);
  float sinAngle = sin(angle);
  vec3 outColor = color * cosAngle + cross(k, color) * sinAngle + k * dot(k, color) * (1.0 - cosAngle);
  return outColor;
}

vec4 main( vec2 fragCoord ) {

  vec2 uv = fragCoord.xy / resolution.xy;
    
  float hueAngle = progress * 2.0 * 3.14159265; // Convert progress to radians
  vec4 texColor = image.eval(fragCoord);
  vec3 rotatedColor = hueRotation(vec3(1, 0, 0), hueAngle);

  if (texColor.a == 0.0) {
    vec2 center = vec2(0.5) * resolution;
    float radius =  resolution.x;
    float distanceFromCenter = distance(fragCoord, center);
    float gradientValue = smoothstep(radius, 0.0, distanceFromCenter);
    vec3 lighterColor = mix(rotatedColor, rotatedColor + vec3(0.4), 1);
    return vec4(mix(rotatedColor, lighterColor, gradientValue), 1.0);
  } else {
      vec3 rotatedTexColor = hueRotation(texColor.rgb, hueAngle);
      return vec4(rotatedTexColor, texColor.a);
  }
}
`)!;

interface HueRotationProps {
  children: ReactNode;
}

export const HueRotation = ({ children }: HueRotationProps) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 5000 }), -1, true);
  }, [progress]);
  const uniforms = useDerivedValue(() => {
    return {
      progress: progress.value,
      resolution: [width, height],
    };
  });
  return (
    <Shader source={background} uniforms={uniforms}>
      {children}
    </Shader>
  );
};
