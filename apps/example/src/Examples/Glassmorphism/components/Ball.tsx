import type { Vector } from "@shopify/react-native-skia";
import {
  BlurMask,
  add,
  vec,
  Circle,
  Paint,
  LinearGradient,
  Group,
} from "@shopify/react-native-skia";
import React from "react";

interface BallProps {
  c: Vector;
  r: number;
}

export const Ball = ({ c, r }: BallProps) => {
  return (
    <Group>
      <Paint>
        <LinearGradient
          start={add(c, vec(-r, 0))}
          end={add(c, vec(r, 0))}
          colors={["#FBE1FF", "#E1ABED"]}
        />
        <BlurMask blur={5} style="solid" />
      </Paint>
      <Group transform={[{ rotate: Math.PI / 3 }]} origin={c}>
        <Circle c={c} r={r} />
      </Group>
    </Group>
  );
};
