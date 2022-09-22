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
  Line,
  rotate,
  useComputedValue,
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
    onStart: ({ y, x }) => {
      origin.current = vec(x, y);
    },
    onActive: ({ x, y }) => {
      pointer.current = vec(x, y);
    },
    onEnd: () => {
      origin.current = vec(0, 0);
      pointer.current = vec(0, 0);
    },
  });
  const p1 = useComputedValue(() => {
    const delta = width - origin.current.x;
    return vec(pointer.current.x + delta, pointer.current.y);
  }, [pointer]);
  const p2 = useComputedValue(() => {
    const delta = width - origin.current.x;
    return vec(origin.current.x + delta, origin.current.y);
  }, [origin]);
  const p3 = useComputedValue(() => {
    return rotate(vec(p1.current.x, 0), p1.current, 0);
  }, [p1]);
  const p4 = useComputedValue(() => {
    return rotate(vec(p1.current.x, height), p1.current, 0);
  }, [p1]);
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
      <Group color="cyan">
        <Circle c={p1} r={10} color="red" />
        <Circle c={p2} r={10} color="green" />
        <Line p1={p3} p2={p4} style="stroke" strokeWidth={2} />
      </Group>
    </Canvas>
  );
};
