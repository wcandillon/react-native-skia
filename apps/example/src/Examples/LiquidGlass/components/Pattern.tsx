import React from "react";
import { Fill, ImageShader, useClock, useImage } from "react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

export const Pattern = () => {
  const clock = useClock();
  const flower = useImage(require("../assets/flowers.jpg"));
  const rect = useDerivedValue(() => {
    return { x: 0, y: (clock.value * 0.055) % 512, width: 512, height: 512 };
  });
  return (
    <Fill>
      <ImageShader
        image={flower}
        rect={rect}
        fit="contain"
        tx="repeat"
        ty="repeat"
      />
    </Fill>
  );
};
