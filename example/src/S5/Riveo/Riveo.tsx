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

const float PI = 3.1415926535897932384626433832795;
const float r = 100.0;

vec4 point(vec2 v, vec2 xy, vec4 cl) {
  if (distance(xy, v) < 5) {
    return vec4(0, 0, 1, 1);
  }
  return cl;
}

vec2 rotate(vec2 point, vec2 pivot, float angle) {
    float dx = point.x - pivot.x;
    float dy = point.y - pivot.y;
    float x = pivot.x + dx * cos(angle) - dy * sin(angle);
    float y = pivot.y + dx * sin(angle) + dy * cos(angle);
    return vec2(x, y);
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

float dline(vec2 p, vec2 a, vec2 b) {  
  vec2 v = a, w = b;
  float l2 = pow(distance(w, v), 2.);
  if(l2 == 0.0) return distance(p, v);
  //float t = clamp(dot(p - v, w - v) / l2, 0., 1.);
  float t = dot(p - v, w - v) / l2;
  vec2 j = v + t * (w - v);
  return distance(p, j);
}

half4 main(float2 xy) {
  half4 cl = vec4(0, 0, 0, 1);
  cl = image.eval(xy);
  cl = line(origin, pointer, xy, cl);
  vec2 p = rotate(origin, pointer, -PI/2);
  cl = line(p, pointer, xy, cl);
  cl = point(pointer, xy, cl);
  cl = point(origin, xy, cl);
  float d = dline(xy, pointer, p);
  if (d > r) {
    return vec4(0, 0, 0, 0);
  }
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
