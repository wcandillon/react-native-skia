import {
  useTouchHandler,
  vec,
  useValue,
  Canvas,
  Fill,
  ImageShader,
  rect,
  Shader,
  Skia,
  useImage,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const d = 600;
const r = 100;
const source = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform vec2 pointer;
uniform vec2 origin;
uniform vec2 resolution;

vec4 point(vec2 v, vec2 xy, vec4 cl) {
  if (distance(xy, v) < 10) {
    return vec4(0, 0, 1, 1);
  }
  return cl;
}

vec4 line(vec2 p1, vec2 p2, vec2 xy, vec4 cl) {
  vec2 p12 = p2 - p1;
  vec2 p13 = xy - p1;
  float d = dot(p12, p13) / length(p12); // = length(p13) * cos(angle)
  vec2 p4 = p1 + normalize(p12) * d;
  if (length(p4 - xy) < 5) {
    return vec4(0.0, 1.0, 0.0, 1.0);
  }
  return cl;
}

half4 main(float2 xy) {
  half4 cl = vec4(0, 0, 0, 1);
  cl = image.eval(xy);
  cl = point(pointer, xy, cl);
  cl = point(origin, xy, cl);
  cl = line(origin, pointer, xy, cl);
  return cl;
}`)!;

const defaultUniforms = {
  pointer: vec(0, 0),
  origin: vec(0, 0),
  resolution: vec(width, height),
};

export const Riveo = () => {
  const uniforms = useValue(defaultUniforms);
  const oslo = useImage(require("../../assets/oslo.jpg"));
  const onTouch = useTouchHandler({
    onStart: ({ y, x }) => {
      uniforms.current = { ...uniforms.current, origin: vec(x, y) };
    },
    onActive: ({ x, y }) => {
      uniforms.current = { ...uniforms.current, pointer: vec(x, y) };
    },
    onEnd: () => {
      uniforms.current = defaultUniforms;
    },
  });
  if (oslo === null) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      <Fill color="cyan" />
      <Fill>
        <Shader source={source} uniforms={uniforms}>
          <ImageShader
            image={oslo}
            fit="cover"
            rect={rect(0, 0, width, height)}
          />
        </Shader>
      </Fill>
    </Canvas>
  );
};
