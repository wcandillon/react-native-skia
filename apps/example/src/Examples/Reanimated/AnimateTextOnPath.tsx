import React, { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Canvas,
  Fill,
  TextPath,
  useFont,
  Skia,
} from "@shopify/react-native-skia";
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
    const p1 = Skia.Path.Make();
    p1.moveTo(Padding, ExampleHeight / 2);
    p1.quadTo(
      (width - Padding * 2) / 2,
      ExampleHeight,
      width - Padding * 2,
      ExampleHeight / 2
    );
    p1.simplify();

    const p2 = Skia.Path.Make();
    p2.moveTo(Padding, ExampleHeight / 2);
    p2.quadTo(
      (width - Padding * 2) / 2,
      0,
      width - Padding * 2,
      ExampleHeight / 2
    );
    p2.simplify();
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
    return path1.interpolate(path2, progress.value)!;
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
