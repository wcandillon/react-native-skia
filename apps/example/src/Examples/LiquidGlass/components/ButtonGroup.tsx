import React from "react";
import {
  Blur,
  Group,
  mix,
  vec,
  type SkPoint,
  type SkSize,
} from "react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { Icon, type IconName } from "./Icon";

export const useButtonGroup = (container: SkSize, r: number) => {
  const width = 7 * r;
  const height = 2 * r;
  const x = (container.width - width) / 2;
  const y = (container.height - height) / 2;
  const progress = useSharedValue(0);
  const box = [2.5 * r, 0, 4.5 * r, 2 * r];
  const c1 = useDerivedValue(() => vec(mix(progress.value, r, 3.5 * r), 0));
  const c2 = useDerivedValue(() => vec(3.5 * r, 0));
  const c3 = useDerivedValue(() => vec(6 * r, 0));
  return { progress, c1, box, bounds: { x, y, width, height }, r, c2, c3 };
};

export const ButtonGroup = ({
  c1,
  progress,
  r,
  c2,
  c3,
  bounds,
}: ReturnType<typeof useButtonGroup>) => {
  return (
    <Group
      transform={[{ translateX: bounds.x }, { translateY: bounds.y + r }]}
      opacity={0.8}
    >
      <IconButton c={c1} r={r} progress={progress} icon1="plus" />
      <IconButton
        c={c2}
        r={r}
        progress={progress}
        icon1="credit-card"
        icon2="search"
      />
      <IconButton c={c3} r={r} progress={progress} icon1="more" icon2="more" />
    </Group>
  );
};

interface IconButtonProps {
  c: SharedValue<SkPoint>;
  r: number;
  progress: SharedValue<number>;
  icon1: IconName;
  icon2?: IconName;
}

const IconButton = ({ c, r, progress: p, icon1, icon2 }: IconButtonProps) => {
  const progress = useDerivedValue(() => {
    return icon1 === icon2 ? 1 : p.value;
  });
  const p1 = progress;
  const p2 = useDerivedValue(() => 1 - progress.value);
  const blur1 = useDerivedValue(() => {
    return (1 - p2.value) * 10;
  });
  const blur2 = useDerivedValue(() => {
    return (1 - p1.value) * 10;
  });
  const transform = useDerivedValue(() => {
    return [{ translateX: c.value.x }, { translateY: c.value.y }];
  });
  return (
    <Group transform={transform}>
      {/* <Circle c={vec(0, 0)} r={r} color="rgba(255, 180, 255, 0.5)" /> */}
      <Group opacity={p2}>
        <Blur blur={blur1} />
        <Icon name={icon1} size={r * 2} />
      </Group>
      {icon2 && (
        <Group opacity={p1}>
          <Blur blur={blur2} />
          <Icon name={icon2} size={r * 2} />
        </Group>
      )}
    </Group>
  );
};
