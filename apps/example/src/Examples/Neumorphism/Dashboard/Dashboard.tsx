import React from "react";
import { useWindowDimensions } from "react-native";
import {
  mix,
  Blur,
  Canvas,
  Circle,
  Fill,
  Group,
  LinearGradient,
  rect,
  useFont,
  vec,
  fitRects,
  rect2rect,
} from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { useLoop } from "../../../components/Animations";

import { Title } from "./components/Title";
import { ProgressBar } from "./components/ProgressBar";
// import { Snow } from "./components/icons/Snow";
// import { Control } from "./components/Control";
// import { Wind } from "./components/icons/Wind";
// import { Sun } from "./components/icons/Sun";
// import { Power } from "./components/icons/Power";
import { Mode } from "./components/Mode";
import { Control } from "./components/Control";
import { Snow } from "./components/icons/Snow";

const width = 390;
const height = 844;
const src = rect(0, 0, width, height);

export const Neumorphism = () => {
  const window = useWindowDimensions();
  const dst = rect(0, 0, window.width, window.height);
  const rects = fitRects("cover", src, dst);
  const transform = rect2rect(rects.src, rects.dst);
  const translateY = useSharedValue(0);
  const t = useLoop({ duration: 3000 });
  const x = useDerivedValue(() => mix(t.value, 0, 180), [t]);
  const progress = useDerivedValue(() => x.value / 192, [x]);
  const font = useFont(require("./components/SF-Pro-Display-Bold.otf"), 17);

  return (
    <Canvas style={{ flex: 1 }}>
      <Group transform={transform}>
        <Group>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={["#2A2D32", "#212326", "#131313"]}
          />
          <Fill />
        </Group>
        <Group>
          <Blur blur={30} />
          <Circle
            color="#56CCF2"
            opacity={0.2}
            cx={width}
            cy={height}
            r={150}
          />
        </Group>
        <Title title="Climate" />
        <ProgressBar progress={progress} />
        <Control
          x={0}
          y={464}
          label="Ac"
          active={true}
          progress={progress}
          font={font}
        >
          <Snow />
        </Control>
        <Mode translateY={translateY} />
      </Group>
    </Canvas>
  );
};
