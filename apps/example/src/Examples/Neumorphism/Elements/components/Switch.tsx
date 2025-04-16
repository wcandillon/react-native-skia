import {
  mix,
  Group,
  BoxShadow,
  Box,
  FitBox,
  rect,
  rrect,
  Circle,
} from "@shopify/react-native-skia";
import React from "react";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

import { Theme } from "./Theme";

const border = rrect(rect(0, 0, 48, 24), 12, 12);
const container = rrect(rect(1, 1, 46, 22), 12, 12);
const dot = rrect(rect(6, 6, 12, 12), 12, 12);

interface SwitchProps {
  x: number;
  y: number;
  width: number;
  pressed: SharedValue<number>;
}

export const Switch = ({ x, y, width, pressed }: SwitchProps) => {
  const transform = useDerivedValue(
    () => [{ translateX: mix(pressed.value, 0, 24) }],
    [pressed]
  );
  const r = useDerivedValue(() => mix(pressed.value, 0, 2), [pressed]);
  return (
    <FitBox src={rect(0, 0, 48, 24)} dst={rect(x, y, width, width * 2)}>
      <Box box={border} color={Theme.white1}>
        <BoxShadow dx={-1} dy={-1} blur={3} color="white" />
        <BoxShadow
          dx={1.5}
          dy={1.5}
          blur={3}
          color="rgba(174, 174, 192, 0.6)"
        />
      </Box>
      <Box box={container} color={Theme.white2}>
        <BoxShadow
          dx={-1}
          dy={-1}
          blur={3}
          color="rgba(255, 255, 255, 0.6)"
          inner
        />
        <BoxShadow
          dx={1.5}
          dy={1.5}
          blur={3}
          color="rgba(174, 174, 192, 0.4)"
          inner
        />
      </Box>
      <Group transform={transform}>
        <Box box={dot} color={Theme.white1}>
          <BoxShadow dx={0} dy={1} blur={4} color="rgba(174, 174, 192, 0.25)" />
          <BoxShadow dx={2} dy={2} blur={3} color="rgba(174, 174, 192, 0.25)" />
        </Box>
        <Circle cx={12} cy={12} r={r} color="#745FF2" opacity={pressed} />
      </Group>
    </FitBox>
  );
};
