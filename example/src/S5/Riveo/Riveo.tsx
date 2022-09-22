import {
  Circle,
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
  Group,
  dist,
  Line,
  useComputedValue,
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

float dist(vec2 a, vec2 b) {
  return sqrt(pow((a.x - b.x), 2) + pow((a.y - b.y), 2));
}

half4 main(float2 xy) {
  if (dist(xy, pointer) < 10 || dist(xy, origin) < 10) {
    return half4(0, 0, 1, 1);
  }
  return image.eval(xy);
}`)!;

export const Riveo = () => {
  const uniforms = useValue({ pointer: vec(0, 0), origin: vec(0, 0) });
  const oslo = useImage(require("../../assets/oslo.jpg"));
  const onTouch = useTouchHandler({
    onStart: ({ y, x }) => {
      uniforms.current = { ...uniforms.current, origin: vec(x, y) };
    },
    onActive: ({ x, y }) => {
      uniforms.current = { ...uniforms.current, pointer: vec(x, y) };
    },
    onEnd: () => {
      uniforms.current = { pointer: vec(0, 0), origin: vec(0, 0) };
    },
  });
  if (oslo === null) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      <Fill color="black" />
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
