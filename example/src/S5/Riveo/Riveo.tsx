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
  if (distance(xy, v) < 5) {
    return vec4(0, 0, 1, 1);
  }
  return cl;
}


// https://www.youtube.com/watch?v=D_Zq6q1gnvw&t=158s
vec4 line(vec2 a, vec2 b, vec2 p, vec4 cl) {
  vec2 ba = b - a;
  vec2 pa = p - a;
  //float k = clamp(dot(ba, pa) / dot(ba, ba), 0.0, 1.0);
  float k = dot(ba, pa) / dot(ba, ba);
  float d = length(pa - ba * k);
  if (d < 5) {
    return vec4(0.3, 0.6, 1.0, 1.0);
  }
  return cl;
}

vec4 perpendicular(vec2 a, vec2 b, vec2 p, vec4 cl) {
  vec2 ba = b - a;
  vec2 pa = p - a;

  if (dot(ba, pa) < 0) {
    return cl;
  }
  return vec4(1.0, 0.0, 0.0, 1.0);
}

half4 main(float2 xy) {
  half4 cl = vec4(0, 0, 0, 1);
  cl = image.eval(xy);
  cl = line(origin, pointer, xy, cl);
  cl = perpendicular(pointer, origin, xy, cl);
  cl = point(pointer, xy, cl);
  cl = point(origin, xy, cl);

  //float d = lengthToAxis(pointer, vec2(pointer.y, -pointer.x), xy, cl);
  // if (d > 50) {
  //   return vec4(0, 0, 0, 1);
  // }
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
