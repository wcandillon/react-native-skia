import {
  BackdropBlur,
  rect,
  rrect,
  Fill,
  RoundedRect,
  Group,
  useImage,
  Image,
} from "@shopify/react-native-skia";
import React from "react";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

const clip = rrect(rect(0, 596, 390, 844), 40, 40);

interface ModeProps {
  translateY: SharedValue<number>;
}

export const Mode = ({ translateY }: ModeProps) => {
  const transform = useDerivedValue(
    () => [{ translateY: translateY.value }],
    [translateY]
  );
  const image = useImage(require("./settings.png"));

  return (
    <Group transform={transform}>
      <BackdropBlur blur={40 / 3} clip={clip}>
        <Fill color="rgba(255, 255, 255, 0.1)" />
        <Group>
          <RoundedRect
            rect={clip}
            style="stroke"
            strokeWidth={1}
            color="rgba(200, 200, 200, 0.5)"
          />
        </Group>
      </BackdropBlur>
      <Image image={image} x={0} y={556} width={390} height={248} />
    </Group>
  );
};
