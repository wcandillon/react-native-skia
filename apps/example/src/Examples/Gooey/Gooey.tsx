import React, { useMemo } from "react";
import type { SkPath, Vector } from "@shopify/react-native-skia";
import {
  Canvas,
  Fill,
  Skia,
  vec,
  Group,
  PathOp,
  rotate,
  mixVector,
  Paint,
  Circle,
  Blur,
  ColorMatrix,
} from "@shopify/react-native-skia";
import { View, useWindowDimensions } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { translate } from "../../components/Animations";

import { Icon, R } from "./components/Icon";
import { Hamburger } from "./components/Hamburger";
import { BG, FG } from "./components/Theme";

interface IconProps {
  c: Vector;
  progress: SharedValue<number>;
  dst: Vector;
}

const IconBackground = ({ progress, c, dst }: IconProps) => {
  const transform = useDerivedValue(() => {
    return translate(mixVector(progress.value, c, dst));
  });
  return (
    <Group transform={transform}>
      <Circle r={R} color={FG} />
    </Group>
  );
};

interface IconForegroundProps extends IconProps {
  path: SkPath;
}

const IconForeground = ({ progress, c, dst, path }: IconForegroundProps) => {
  const transform = useDerivedValue(() => {
    return translate(mixVector(progress.value, c, dst));
  });
  return (
    <Group transform={transform}>
      <Icon path={path} />
    </Group>
  );
};

const p1 = Skia.Path.MakeFromSVGString(
  "M 22.54 6.42 A 2.78 2.78 0 0 0 20.6 4.42 C 18.88 4 12 4 12 4 C 12 4 5.12 4 3.4 4.46 A 2.78 2.78 0 0 0 1.46 6.46 A 29 29 0 0 0 1 11.75 A 29 29 0 0 0 1.46 17.08 A 2.78 2.78 0 0 0 3.4 19 C 5.12 19.46 12 19.46 12 19.46 C 12 19.46 18.88 19.46 20.6 19 A 2.78 2.78 0 0 0 22.54 17 A 29 29 0 0 0 23 11.75 A 29 29 0 0 0 22.54 6.42 Z"
)!;
const p2 = Skia.Path.MakeFromSVGString(
  "M 9.75 15.02 L 15.5 11.75 L 9.75 8.48 L 9.75 15.02 Z"
)!;

const youtube = Skia.Path.MakeFromOp(p1, p2, PathOp.Difference)!;

const icon1 = Skia.Path.MakeFromSVGString(
  "M 23 3 A 10.9 10.9 0 0 1 19.86 4.53 A 4.48 4.48 0 0 0 12 7.53 L 12 8.53 A 10.66 10.66 0 0 1 3 4 C 3 4 -1 13 8 17 A 11.64 11.64 0 0 1 1 19 C 10 24 21 19 21 7.5 A 4.5 4.5 0 0 0 20.92 6.67 A 7.72 7.72 0 0 0 23 3 Z"
)!;

const icon2 = Skia.Path.MakeFromSVGString(
  "M 18 2 L 15 2 A 5 5 0 0 0 10 7 L 10 10 H 7 V 14 H 10 V 22 H 14 V 14 H 17 L 18 10 H 14 V 7 A 1 1 0 0 1 15 6 H 18 Z"
)!;

export const Gooey = () => {
  const { width, height } = useWindowDimensions();

  const c = useMemo(() => vec(width / 2, height / 2 - 64), [height, width]);

  const icons = useMemo(
    () => [
      {
        path: icon1,
        dst: rotate(vec(c.x + 150, c.y), c, Math.PI / 4),
      },
      {
        path: icon2,
        dst: rotate(vec(c.x + 150, c.y), c, Math.PI / 2),
      },
      {
        path: youtube,
        dst: rotate(vec(c.x + 150, c.y), c, 0.75 * Math.PI),
      },
    ],
    [c]
  );
  const progress = useSharedValue(0);
  const toggle = useSharedValue(0);

  const gesture = Gesture.Tap().onEnd(() => {
    toggle.value = toggle.value === 0 ? 1 : 0;
    progress.value = withSpring(toggle.value);
  });

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ flex: 1 }}>
          <Fill color={BG} />
          <Group
            layer={
              <Paint>
                <ColorMatrix
                  matrix={[
                    1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 18,
                    -7,
                  ]}
                />
                <Blur blur={20} />
              </Paint>
            }
          >
            {icons.map((icon, i) => (
              <IconBackground
                key={i}
                progress={progress}
                c={c}
                dst={icon.dst}
              />
            ))}
            <Group transform={translate(c)}>
              <Circle r={R} color={FG} />
            </Group>
          </Group>
          {icons.map((icon, i) => (
            <IconForeground
              key={i}
              progress={progress}
              c={c}
              dst={icon.dst}
              path={icon.path}
            />
          ))}
          <Group transform={translate(c)}>
            <Hamburger />
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
};
