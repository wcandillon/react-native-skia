import React, { useMemo } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import {
  Skia,
  Canvas,
  Image,
  Group,
  Circle,
  Rect,
  Mask,
  useImage,
  mix,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { useLoop } from "../../components/Animations";

const star = Skia.Path.MakeFromSVGString(
  "M 293.4 16 C 266.3 16 244.4 37.9 244.4 65 C 244.4 92.1 266.3 114 293.4 114 C 320.4 114 342.4 92.1 342.4 65 C 342.4 37.9 320.4 16 293.4 16 Z M 311 90.6 L 293.4 81.1 L 275.7 90.6 L 279.2 70.9 L 264.8 57 L 284.6 54.2 L 293.4 36.2 L 302.1 54.2 L 321.9 57 L 307.5 70.9 L 311 90.6 V 90.6 Z"
)!;
const PADDING = 16;

export const Clipping = () => {
  const { width } = useWindowDimensions();
  const SIZE = width / 4;
  const clipRRect = useMemo(
    () =>
      Skia.RRectXY(
        Skia.XYWHRect(
          PADDING + SIZE + PADDING * 2,
          PADDING * 2,
          SIZE - 2 * PADDING,
          SIZE - 2 * PADDING
        ),
        25,
        25
      ),
    [SIZE]
  );

  const progress = useLoop({ duration: 3000 });
  const x = useDerivedValue(() => mix(progress.value, 0, 200), [progress]);
  const oslo = useImage(require("../../assets/oslo.jpg"));

  return (
    <ScrollView>
      <Canvas style={{ width, height: SIZE + 32 }}>
        <Image
          image={oslo}
          x={PADDING}
          y={PADDING}
          width={SIZE}
          height={SIZE}
          fit="cover"
        />
        <Group clip={clipRRect} invertClip>
          <Image
            image={oslo}
            x={SIZE + 2 * PADDING}
            y={PADDING}
            width={SIZE}
            height={SIZE}
            fit="cover"
          />
        </Group>
        <Group clip={star}>
          <Image
            image={oslo}
            x={2 * SIZE + 3 * PADDING}
            y={PADDING}
            width={SIZE}
            height={SIZE}
            fit="cover"
          />
        </Group>
      </Canvas>
      <Canvas style={{ width, height: 200 }}>
        <Rect x={x} y={0} width={200} height={200} color="green" />
        <Mask
          mode="alpha"
          clip
          mask={
            <Group>
              <Circle cx={100} cy={100} r={120} color="#00000066" />
              <Circle cx={100} cy={100} r={50} color="black" />
            </Group>
          }
        >
          <Rect x={0} y={0} width={200} height={200} color="lightblue" />
        </Mask>
        <Mask
          mode="luminance"
          mask={
            <Group>
              <Circle cx={300} cy={100} r={100} color="white" />
              <Circle cx={300} cy={100} r={50} color="black" />
            </Group>
          }
        >
          <Rect x={200} y={0} width={200} height={200} color="lightblue" />
        </Mask>
      </Canvas>
    </ScrollView>
  );
};
