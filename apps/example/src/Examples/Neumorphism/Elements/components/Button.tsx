import {
  FitBox,
  rect,
  rrect,
  Box,
  BoxShadow,
  mix,
} from "@shopify/react-native-skia";
import type { ReactNode } from "react";
import React from "react";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

import { Theme } from "./Theme";

const border = rrect(rect(0, 0, 24, 24), 5, 5);
const container = rrect(rect(1, 1, 22, 22), 5, 5);

interface ButtonProps {
  x: number;
  y: number;
  width: number;
  height: number;
  pressed: SharedValue<number>;
  children: ReactNode | ReactNode[];
}

export const Button = ({
  x,
  y,
  width,
  height,
  pressed,
  children,
}: ButtonProps) => {
  const c1 = useDerivedValue(
    () => `rgba(255, 255, 255, ${mix(pressed.value, 0, 0.7)})"`,
    [pressed]
  );
  const c2 = useDerivedValue(
    () => `rgba(174, 174, 192, ${mix(pressed.value, 0, 0.5)})"`,
    [pressed]
  );
  return (
    <FitBox src={rect(0, 0, 24, 24)} dst={rect(x, y, width, height)}>
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
        <BoxShadow dx={-1} dy={-1} blur={3} color={c1} inner />
        <BoxShadow dx={1.5} dy={1.5} blur={3} color={c2} inner />
      </Box>
      {children}
    </FitBox>
  );
};
