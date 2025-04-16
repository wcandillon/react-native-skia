import {
  Blur,
  Circle,
  Group,
  LinearGradient,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";
import type { ReactNode } from "react";
import React from "react";

import { translate } from "../../../../components/Animations";

export const BUTTON_SIZE = 62;
const PADDING = 6;

const r2 = BUTTON_SIZE / 2;
const r1 = r2 - 6;

interface ButtonProps {
  x: number;
  y: number;
  children?: ReactNode | ReactNode[];
}
export const Button = ({ x, y, children }: ButtonProps) => {
  return (
    <Group transform={translate({ x, y })}>
      <Group>
        <RadialGradient
          c={vec(r2, r2)}
          r={r2}
          colors={["#5D6167", "#13151A"]}
        />
        <Blur blur={20} />
        <Circle cx={r2} cy={r2} r={r2} />
      </Group>
      <Group>
        <RadialGradient
          c={vec(PADDING + r1, PADDING + r1)}
          r={PADDING + r1}
          colors={["#545659", "#232629"]}
        />
        <Circle cx={6 + r1} cy={6 + r1} r={r1} opacity={0.5} />
      </Group>
      <Group>
        <LinearGradient
          start={vec(PADDING, PADDING)}
          end={vec(12 + 3 * r1, 12 + 3 * r1)}
          colors={["rgba(0, 0, 0, 0.45)", "white"]}
        />
        <Circle
          cx={PADDING + r1}
          cy={PADDING + r1}
          r={r1}
          style="stroke"
          strokeWidth={1.5}
        />
      </Group>
      <Group
        transform={[{ translateX: r1 - 6 }, { translateY: r1 - 6 }]}
        color="rgba(235, 235, 245, 0.6)"
      >
        {children}
      </Group>
    </Group>
  );
};
