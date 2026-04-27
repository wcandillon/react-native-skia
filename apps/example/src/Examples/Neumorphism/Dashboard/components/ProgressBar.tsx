import {
  BoxShadow,
  rect,
  rrect,
  Group,
  LinearGradient,
  Circle,
  Skia,
  vec,
  Path,
  SweepGradient,
  useFont,
  Text,
  Box,
} from "@shopify/react-native-skia";
import React from "react";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

const r1 = 85;
const path = Skia.Path.Circle(12 + r1, 12 + r1, r1);
const c = vec(12 + r1, 12 + r1);

const fromCircle = (cx: number, cy: number, r: number) =>
  rrect(rect(cx - r, cy - r, 2 * r, 2 * r), r, r);

interface ProgressBarProps {
  progress: SharedValue<number>;
}

const colors = ["#2FB8FF", "#9EECD9"];

export const ProgressBar = ({ progress }: ProgressBarProps) => {
  const font = useFont(require("./SF-Mono-Semibold.otf"), 32);
  const text = useDerivedValue(
    () => `${Math.round(progress.value * 100)}°C`,
    [progress]
  );
  if (font === null) {
    return null;
  }
  const textWidth = font.measureText("00°C").width;
  return (
    <Group transform={[{ translate: [100, 223] }]}>
      <Group>
        <LinearGradient
          start={vec(12, 12)}
          end={vec(200, 200)}
          colors={["#101113", "#2B2F33"]}
        />
        <Box box={fromCircle(12 + 85, 12 + 85, 85)}>
          <BoxShadow dx={18} dy={18} blur={65} color="#141415" />
          <BoxShadow dx={-18} dy={-18} blur={65} color="#485057" />
          <BoxShadow
            dx={-12}
            dy={-12}
            blur={45}
            color="rgba(72, 80, 87, 0.6)"
            inner
          />
          <BoxShadow
            dx={12}
            dy={12}
            blur={45}
            color="rgba(0, 0, 0, 0.7)"
            inner
          />
        </Box>
      </Group>
      <Box box={fromCircle(37 + 60, 37 + 60, 60)} color="#32363B">
        <BoxShadow
          dx={-25}
          dy={-25}
          blur={120}
          color="rgba(59, 68, 81, 0.7)"
          inner
        />
        <BoxShadow
          dx={25}
          dy={25}
          blur={160}
          color="rgba(0, 0, 0, 0.7)"
          inner
        />
        <BoxShadow
          dx={-15}
          dy={-15}
          blur={70}
          color="rgba(110, 120, 130, 0.5)"
          inner
        />
        <BoxShadow
          dx={15}
          dy={15}
          blur={90}
          color="rgba(0, 0, 0, 0.6)"
          inner
        />
      </Box>
      <Box box={fromCircle(c.x, c.y, 42)} color="#2A2D31">
        <BoxShadow
          dx={-6}
          dy={-6}
          blur={28}
          color="rgba(120, 130, 140, 0.45)"
          inner
        />
        <BoxShadow
          dx={6}
          dy={6}
          blur={28}
          color="rgba(0, 0, 0, 0.7)"
          inner
        />
      </Box>
      <Text
        x={c.x - textWidth / 2}
        y={c.y + font.getSize() / 2}
        font={font}
        text={text}
        color="white"
      />
      <Group>
        <SweepGradient c={vec(12 + r1, 12 + r1)} colors={colors} />
        <Path
          path={path}
          style="stroke"
          strokeWidth={15}
          end={progress}
          strokeCap="round"
        />
        <Circle cx={12 + 2 * r1} cy={12 + r1} r={15 / 2} color={colors[0]} />
      </Group>
    </Group>
  );
};
