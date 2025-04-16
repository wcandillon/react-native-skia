import React from "react";
import {
  Shadow,
  Group,
  Paint,
  mix,
  rrect,
  FitBox,
  rect,
  RoundedRect,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

import { Theme } from "./Theme";

const container = rect(0, 0, 120, 8);
const aspectRatio = 8 / 120;
const rct1 = rrect(container, 12, 12);
const rct2 = rrect(rect(1, 1, 118, 6), 12, 12);

interface ProgressBarProps {
  x: number;
  y: number;
  width: number;
  progress: SharedValue<number>;
}

export const ProgressBar = ({ progress, x, y, width }: ProgressBarProps) => {
  const rct3 = useDerivedValue(
    () => rrect(rect(2, 2, mix(progress.value, 0, 116), 4), 12, 12),
    [progress]
  );
  return (
    <FitBox src={container} dst={rect(x, y, width, width * aspectRatio)}>
      <Group>
        <Paint>
          <Shadow dx={-1} dy={-1} blur={3} color="rgba(255, 255, 255, 1)" />
          <Shadow dx={1.5} dy={1.5} blur={3} color="rgba(174, 174, 192, 0.4)" />
        </Paint>
        <RoundedRect rect={rct1} color={Theme.white1} />
      </Group>
      <Group>
        <Paint>
          <Shadow
            dx={-1}
            dy={-1}
            blur={1}
            color="rgba(255, 255, 255, 0.7)"
            inner
          />
          <Shadow dx={1} dy={1} blur={2} color="rgba(174, 174, 192, 0.2)" />
        </Paint>
        <RoundedRect rect={rct2} color={Theme.white2} />
      </Group>
      <Group>
        <Paint>
          <Shadow dx={0} dy={0} blur={2} color="rgba(	114, 138, 183, 0.7)" />
        </Paint>
        <RoundedRect rect={rct3} color={"#728AB7"} />
      </Group>
    </FitBox>
  );
};
