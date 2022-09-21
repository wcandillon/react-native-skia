import type { Vector } from "@shopify/react-native-skia";
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
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const source = Skia.RuntimeEffect.Make(`
uniform shader image;

half4 main(float2 xy) {   
  return image.eval(xy);
}`)!;

export const Riveo = () => {
  const origin = useValue(vec(0, 0));
  const pointer = useValue(vec(0, 0));
  const oslo = useImage(require("../../assets/oslo.jpg"));
  const onTouch = useTouchHandler({
    onStart: ({ y }) => {
      origin.current = vec(width, y);
    },
    onActive: ({ x, y }) => {
      pointer.current = vec(x, y);
    },
    onEnd: () => {
      origin.current = vec(0, 0);
      pointer.current = vec(0, 0);
    },
  });
  if (oslo === null) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      <Fill>
        <Shader source={source}>
          <ImageShader
            image={oslo}
            fit="cover"
            rect={rect(0, 0, width, height)}
          />
        </Shader>
      </Fill>
      <Circle color="cyan" c={origin} r={10} />
      <Circle color="cyan" c={pointer} r={10} />
    </Canvas>
  );
};
