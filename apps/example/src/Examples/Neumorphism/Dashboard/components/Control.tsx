import {
  Shadow,
  vec,
  Group,
  Text,
  Circle,
  LinearGradient,
} from "@shopify/react-native-skia";
import type { SkFont } from "@shopify/react-native-skia";
import type { ReactNode } from "react";
import React from "react";
import type { SharedValue } from "react-native-reanimated";

import { Slider } from "./Slider";

const r = 25;

interface ControlProps {
  x: number;
  y: number;
  progress: SharedValue<number>;
  label: string;
  children: ReactNode;
  active?: boolean;
  font: SkFont | null;
}

export const Control = ({
  x,
  y,
  children,
  font,
  label,
  progress,
  active = false,
}: ControlProps) => {
  if (font === null) {
    return null;
  }
  const labelWidth = font.measureText(label).width;
  return (
    <Group transform={[{ translate: [x + 30, y + 30] }]}>
      <Text
        x={2 * r - labelWidth - 16}
        y={r + font.getSize() / 2}
        font={font}
        color="white"
        text={label}
      />
      <Group transform={[{ translateX: 50 }]}>
        <Group>
          <Shadow dx={4} dy={6} blur={20} color="rgba(0, 0,0,0.25)" />
          <LinearGradient
            start={vec(0, 0)}
            end={vec(50, 50)}
            colors={["#141515", "#2E3236"]}
          />
          <Circle cx={r} cy={r} r={r} />
        </Group>
        <Group>
          <Circle
            cx={r}
            cy={r}
            r={r}
            style="stroke"
            color="#282B2E"
            strokeWidth={1}
          />
        </Group>
        <Group transform={[{ translate: [r / 2, r / 2] }]}>
          <Group color="rgba(235, 235, 245, 0.6)">
            {active && (
              <LinearGradient
                start={vec(0, 0)}
                end={vec(24, 24)}
                colors={["#2FB8FF", "#9EECD9"]}
              />
            )}
            {children}
          </Group>
        </Group>
        <Slider x={2 * r + 16} y={r - 8} progress={progress} />
      </Group>
    </Group>
  );
};
