import {
  Shadow,
  Canvas,
  Fill,
  Group,
  Paint,
  RoundedRect,
} from "@shopify/react-native-skia";
import React from "react";

const PADDING = 32;
const SIZE = 256 - 64;
const R = 32;

export const Neumorphism = () => {
  return (
    <Canvas>
      <Fill color="lightblue" />
      <Group>
        <Paint>
          <Shadow dx={12} dy={12} blur={25} color="#93b8c4" />
          <Shadow dx={-12} dy={-12} blur={25} color="#c7f8ff" />
        </Paint>
        <RoundedRect
          x={PADDING}
          y={PADDING}
          width={SIZE}
          height={SIZE}
          r={R}
          color="lightblue"
        />
      </Group>

      <Group>
        <Paint>
          <Shadow dx={12} dy={12} blur={25} color="#93b8c4" inner />
          <Shadow dx={-12} dy={-12} blur={25} color="#c7f8ff" inner />
        </Paint>
        <RoundedRect
          x={PADDING}
          y={2 * PADDING + SIZE}
          width={SIZE}
          height={SIZE}
          r={R}
          color="lightblue"
        />
      </Group>
    </Canvas>
  );
};
