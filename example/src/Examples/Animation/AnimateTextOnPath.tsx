import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Canvas,
  Easing,
  Fill,
  TextPath,
  useDerivedValue,
  usePath,
  useLoop,
  useFont,
} from "@shopify/react-native-skia";

import { AnimationDemo, Padding } from "./Components";

const ExampleHeight = 60;

export const AnimateTextOnPath = () => {
  const { width } = useWindowDimensions();

  const font = useFont("helvetica", 14);

  // Create a progress going from 0..1 and back
  const progress = useLoop({
    duration: 700,
    easing: Easing.inOut(Easing.cubic),
  });

  // Create the start path
  const path1 = usePath((p) => {
    p.moveTo(Padding, ExampleHeight / 2);
    p.quadTo(
      (width - Padding * 2) / 2,
      ExampleHeight,
      width - Padding * 2,
      ExampleHeight / 2
    );
    p.simplify();
  });

  // Create the end path
  const path2 = usePath((p) => {
    p.moveTo(Padding, ExampleHeight / 2);
    p.quadTo(
      (width - Padding * 2) / 2,
      0,
      width - Padding * 2,
      ExampleHeight / 2
    );
    p.simplify();
  });

  // Create a derived value that interpolates between
  // the start and end path
  const path = useDerivedValue(
    () => path1.interpolate(path2, progress.current),
    [progress]
  );

  return font ? (
    <AnimationDemo title={"Interpolating text on path."}>
      <Canvas style={styles.canvas}>
        <Fill color="white" />
        <TextPath path={path} font={font} text="Hello World from RN Skia!" />
      </Canvas>
    </AnimationDemo>
  ) : null;
};

const styles = StyleSheet.create({
  canvas: {
    height: ExampleHeight,
    width: "100%",
    backgroundColor: "#FEFEFE",
  },
});
