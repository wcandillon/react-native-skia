import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  LinearGradient,
  mix,
  polar2Canvas,
  vec,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";
import { interpolate } from "react-native-reanimated";

const toRad = (deg: number) => (deg * Math.PI) / 180;

const N = 150;
const { width, height } = Dimensions.get("window");
const center = vec(width / 2, height / 2);

export const AppleBreathe = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="black" />
      <Group>
        <BlurMask blur={2} style="solid" />
        {new Array(N).fill(0).map((_, n) => {
          const theta = n * toRad(137.5);
          const c = interpolate(n, [0, N], [10, 20]);
          const radius = c * Math.sqrt(n);
          const { x, y } = polar2Canvas({ theta, radius }, center);
          const r = interpolate(n, [0, N], [5, 25]);
          return (
            <Group key={n}>
              <LinearGradient
                colors={["#3EAEC5", "#1783AD"]}
                start={vec(x - r, y)}
                end={vec(x + r, y)}
              />
              <Circle
                cx={x}
                cy={y}
                r={r}
                opacity={interpolate(n, [0, N], [1, 0.7])}
              />
            </Group>
          );
        })}
      </Group>
    </Canvas>
  );
};
