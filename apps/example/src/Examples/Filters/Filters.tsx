import React from "react";
import { Pressable, useWindowDimensions } from "react-native";
import {
  useImage,
  Canvas,
  ImageShader,
  Skia,
  Shader,
  mix,
  Fill,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { useLoop } from "../../components/Animations";

const source = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float r;

half4 main(float2 xy) {   
  xy.x += sin(xy.y / r) * 4;
  return image.eval(xy).rbga;
}`)!;

export const Filters = () => {
  const { width, height } = useWindowDimensions();
  const progress = useLoop({ duration: 1500 });
  const [, setState] = React.useState(0);

  const uniforms = useDerivedValue(
    () => ({ r: mix(progress.value, 1, 100) }),
    [progress]
  );

  const image = useImage(require("../../assets/oslo.jpg"));

  return (
    <Pressable style={{ width, height }} onPress={() => setState((i) => i + 1)}>
      <Canvas style={{ width, height }}>
        <Fill>
          <Shader source={source} uniforms={uniforms}>
            <ImageShader
              image={image}
              fit="cover"
              x={0}
              y={0}
              tx="repeat"
              ty="repeat"
              width={width}
              height={height}
            />
          </Shader>
        </Fill>
      </Canvas>
    </Pressable>
  );
};
