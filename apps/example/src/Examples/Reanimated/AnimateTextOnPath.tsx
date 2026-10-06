import React, { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Fill, TextPath, useFont, Skia } from "react-native-skia";
import {
  useSharedValue,
  Easing,
  withTiming,
  withRepeat,
  useDerivedValue,
} from "react-native-reanimated";

import { AnimationDemo, Padding } from "./Components";

const ExampleHeight = 60;
const Font = require("../../assets/SF-Mono-Semibold.otf");

export const AnimateTextOnPath = () => {
  const { width } = useWindowDimensions();

  const font = useFont(Font, 12);

  const { path1, path2 } = useMemo(() => {
    const p1Base = Skia.PathBuilder.Make()
      .moveTo(Padding, ExampleHeight / 2)
      .quadTo(
        (width - Padding * 2) / 2,
        ExampleHeight,
        width - Padding * 2,
        ExampleHeight / 2
      )
      .build();
    const p1 = Skia.Path.Simplify(p1Base) ?? p1Base;

    const p2Base = Skia.PathBuilder.Make()
      .moveTo(Padding, ExampleHeight / 2)
      .quadTo(
        (width - Padding * 2) / 2,
        0,
        width - Padding * 2,
        ExampleHeight / 2
      )
      .build();
    const p2 = Skia.Path.Simplify(p2Base) ?? p2Base;
    return { path1: p1, path2: p2 };
  }, [width]);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, [progress]);

  const path = useDerivedValue(() => {
    return Skia.Path.Interpolate(path1, path2, progress.value)!;
  });

  return (
    <AnimationDemo title={"Interpolating text on path."}>
      <Canvas style={styles.canvas}>
        <Fill color="white" />
        {font && (
          <TextPath path={path} font={font} text="Hello World from RN Skia!" />
        )}
      </Canvas>
    </AnimationDemo>
  );
};

const styles = StyleSheet.create({
  canvas: {
    height: ExampleHeight,
    width: "100%" as const,
    backgroundColor: "#FEFEFE" as const,
  },
});
