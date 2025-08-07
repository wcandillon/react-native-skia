import type {
  SkImageFilter,
  SkRuntimeEffect,
  SkShader,
  SkSize,
} from "@shopify/react-native-skia";
import {
  BackdropFilter,
  Canvas,
  convertToColumnMajor3,
  ImageFilter,
  processTransform2d,
  processUniforms,
  Skia,
  TileMode,
  useCanvasSize,
} from "@shopify/react-native-skia";
import React from "react";
import {
  ReduceMotion,
  useDerivedValue,
  withSpring,
} from "react-native-reanimated";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { frag, glsl } from "../../../components/ShaderLib";

import { ButtonGroup, useButtonGroup } from "./ButtonGroup";
import { Pattern } from "./Pattern";

export const baseUniforms = glsl`
uniform float progress;
uniform vec2 c1;
uniform vec4 box;
uniform float r;
`;

const source = frag`
${baseUniforms}

vec3 sdCircle( in vec2 p, in float r ) 
{
    float d = length(p);
    return vec3( d-r, p/d );
}

vec3 sdRoundedBox( in vec2 p, in vec2 b, vec4 ra )
{
    ra.xy   = (p.x>0.0)?ra.xy : ra.zw;
    float r = (p.y>0.0)?ra.x  : ra.y;
    
    vec2 w = abs(p)-(b-r);
    vec2 s = vec2(p.x<0.0?-1:1,p.y<0.0?-1:1);
    
    float g = max(w.x,w.y);
	vec2  q = max(w,0.0);
    float l = length(q);
    
    return vec3(   (g>0.0)?l-r: g-r,
                s*((g>0.0)?q/l : ((w.x>w.y)?vec2(1,0):vec2(0,1))));
}


vec3 smin( in vec3 a, in vec3 b, in float k )
{
    k *= 4.0;
    float h = max(k-abs(a.x-b.x),0.0);
    float m = 0.25*h*h/k;
    float n = 0.50*  h/k;
    return vec3( min(a.x,  b.x) - m, 
                 mix(a.yz, b.yz, (a.x<b.x)?n:1.0-n) );
}

vec2 glassDistortion(vec3 sdf, float radius) {
  vec2 gradient = sdf.yz;
  float gradientMagnitude = length(gradient);
  
  // Create distance-based falloff for more realistic glass effect
  float distanceFactor = 1.0 - smoothstep(0.0, radius * 0.8, abs(sdf.x));
  
  // Distortion strength - stronger at edges where gradient is high
  float distortionStrength = gradientMagnitude * distanceFactor * 0.3;
  
  // Calculate displacement based on surface normals
  // Simulate light bending through curved glass
  vec2 displacement = gradient * distortionStrength;
  
  // Convert to displacement map format (0.5 = neutral, <0.5 = negative, >0.5 = positive)
  vec2 displacementMap = 0.5 + displacement;
  
  // Clamp to valid range
  return clamp(displacementMap, 0.0, 1.0);
}

vec2 waterDropletDistortion(vec3 sdf, float radius) {
  // Maximum distortion at center, exponential falloff towards edges
  float distance = abs(sdf.x);
  float falloff = exp(-distance * 2.0 / radius);
  
  // Create radial distortion pattern from center
  vec2 center = vec2(0.0);
  vec2 fromCenter = normalize(sdf.yz + vec2(0.001)); // avoid division by zero
  
  // Lens-like radial distortion - stronger at center
  float radialStrength = falloff * 0.6;
  vec2 displacement = fromCenter * radialStrength;
  
  // Convert to displacement map format
  vec2 displacementMap = 0.5 + displacement;
  
  return clamp(displacementMap, 0.0, 1.0);
}

vec2 fresnelDistortion(vec3 sdf, float radius, float scale, float thickness, vec2 viewDirection) {
  vec2 gradient = sdf.yz;
  vec2 normalizedGradient = normalize(gradient + vec2(0.001)); // avoid division by zero
  
  // Fresnel effect - stronger distortion at glancing angles
  float edge_factor = 1.0 - abs(dot(normalizedGradient, viewDirection));
  
  // Thickness-based falloff inside the shape
  float thicknessFactor = smoothstep(0.0, thickness, abs(sdf.x));
  
  // Calculate displacement with Fresnel modulation
  vec2 displacement = scale * gradient * edge_factor * thicknessFactor;
  
  // Convert to displacement map format
  vec2 displacementMap = 0.5 + displacement;
  
  return clamp(displacementMap, 0.0, 1.0);
}


half4 main(float2 p) {
  float circleRadius = r * (1.0 - smoothstep(0.8, 1.0, progress));
  vec3 sdf1 = sdCircle(p + vec2(0, -r) - c1, circleRadius);
  vec3 sdf2 = sdRoundedBox(p - box.xy - box.zw * 0.5, box.zw * 0.5, vec4(r));
  float k = 10 + 10 * (1.0 - abs(2.0 * progress - 1.0));
  vec3 sdf = smin(sdf1, sdf2, k);

  // Outside the shape - no displacement
  if (sdf.x > 0.0) {
     return vec4(0.0, 0.0, 0.0, 0.0);
  }

  // Fresnel distortion parameters:
  // Scale: distortion strength (higher = more distortion)
  // Thickness: glass thickness falloff (lower = more visible effect) 
  // View direction: viewing angle for Fresnel effect
  
  // Current: Strong glass effect
  vec2 displacementMap = glassDistortion(sdf, r);//fresnelDistortion(sdf, r, 2.0, r * 0.2, vec2(0.0, -1.0));
  
  // Alternative parameter sets to try:
  // Subtle wine glass: fresnelDistortion(sdf, r, 0.6, r * 0.5, vec2(0.0, -1.0));
  // Heavy crystal: fresnelDistortion(sdf, r, 2.0, r * 0.2, vec2(0.0, -1.0));
  // Side view glass: fresnelDistortion(sdf, r, 1.0, r * 0.4, vec2(1.0, 0.0));
  // Angled viewing: fresnelDistortion(sdf, r, 1.5, r * 0.25, vec2(0.7, -0.7));
  
  return vec4(displacementMap, 0.0, 1.0);
}
`;

const r = 55;

interface SceneProps {
  filter?: (shader: SkShader, size: SkSize) => SkImageFilter;
  shader?: SkRuntimeEffect;
}

export const Scene = ({
  filter: filterCB,
  shader: shaderFilter,
}: SceneProps) => {
  const { ref, size } = useCanvasSize();
  const { width, height } = size;
  const props = useButtonGroup({ width, height }, r);
  const { progress, c1, box, bounds } = props;
  const uniforms = useDerivedValue(() => {
    return {
      progress: progress.value,
      c1: c1.value,
      box: box,
      boxRadius: r,
      r,
    };
  });
  const filter = useDerivedValue(() => {
    const localMatrix = processTransform2d([
      { translateX: bounds.x },
      { translateY: bounds.y },
    ]);
    if (filterCB) {
      const shader = source.makeShader(
        processUniforms(source, uniforms.value),
        localMatrix
      );
      return filterCB(shader, size);
    } else if (shaderFilter) {
      const builder = Skia.RuntimeShaderBuilder(shaderFilter);
      const transform = convertToColumnMajor3(localMatrix.get());
      processUniforms(
        shaderFilter,
        {
          ...uniforms.value,
          transform,
          resolution: [width, height],
        },
        builder
      );
      return Skia.ImageFilter.MakeRuntimeShaderWithChildren(
        builder,
        0,
        ["blurredImage"],
        [Skia.ImageFilter.MakeBlur(8, 8, TileMode.Clamp)]
      );
    } else {
      throw new Error("No filter or shader provided");
    }
  });
  const gesture = Gesture.Tap().onEnd(() => {
    progress.value = withSpring(progress.value === 0 ? 1 : 0, {
      duration: 1000,
      dampingRatio: 0.5,
      // mass: 1,
      // damping: 10,
      stiffness: 100,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2,
      reduceMotion: ReduceMotion.System,
    });
  });
  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ flex: 1 }} ref={ref}>
          <Pattern />
          <BackdropFilter filter={<ImageFilter filter={filter} />} />
          <ButtonGroup {...props} />
        </Canvas>
      </GestureDetector>
    </View>
  );
};
