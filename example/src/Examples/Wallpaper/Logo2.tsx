import {
  Canvas,
  Fill,
  Circle,
  Oval,
  rect,
  vec,
  Group,
  SweepGradient,
  RadialGradient,
  BlurMask,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
// 470/180
const center = vec(width / 2, height / 2);
const PADDING = 32;
const r = 0.75 * PADDING;
const strokeWidth = r;
const rx = width / 2 - PADDING;
const ry = (rx * 180) / 470;
const rct = rect(center.x - rx, center.y - ry, rx * 2, ry * 2);
const c1 = "#3884FF";
const c2 = "#51D3ED";

export const Wallpaper = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="white" />
      <Group>
        <BlurMask blur={2} style="inner" />
        <Circle c={center} color="lightblue" r={r}>
          <RadialGradient
            c={vec(center.x + r / 2, center.y + r / 2)}
            colors={[c1, c2]}
            r={2 * r}
          />
        </Circle>
        <Group>
          <SweepGradient c={center} colors={[c1, c2, c1]} />
          <Group transform={[{ scaleX: -1 }]} origin={center}>
            <Oval rect={rct} style="stroke" strokeWidth={strokeWidth} />
          </Group>
          <Group transform={[{ rotate: Math.PI / 3 }]} origin={center}>
            <Oval rect={rct} style="stroke" strokeWidth={strokeWidth} />
          </Group>
          <Group transform={[{ rotate: -Math.PI / 3 }]} origin={center}>
            <Oval rect={rct} style="stroke" strokeWidth={strokeWidth} />
          </Group>
        </Group>
      </Group>
    </Canvas>
  );
};
