import React from "react";
import {
  Skia,
  Canvas,
  useClock,
  Group,
  Skottie as SkSkottie,
} from "react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import lego from "./lego_loader.json";

const animation = Skia.Skottie.Make(JSON.stringify(lego))!;

export const Skottie = () => {
  const clock = useClock();
  const frame = useDerivedValue(() => {
    const fps = animation.fps();
    const duration = animation.duration();
    const currentFrame =
      Math.floor((clock.value / 1000) * fps) % (duration * fps);
    return currentFrame;
  });
  return (
    <Canvas style={{ flex: 1 }}>
      <Group transform={[{ scale: 0.5 }]}>
        <SkSkottie animation={animation} frame={frame} />
      </Group>
    </Canvas>
  );
};
