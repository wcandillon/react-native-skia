import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import {
  Skia,
  SkiaReadonlyValue,
  Drawing,
  Canvas,
} from "@shopify/react-native-skia";

const { width, height } = Dimensions.get("window");

export const Matrix = () => {
  const color = Skia.Node.MakeColor(0xffff00ff);
  const plane = Skia.Node.MakePlane();
  const draw = Skia.Node.MakeDraw(plane, color);
  const scene = Skia.Node.MakeScene(draw);
  return (
    <Canvas style={styles.container} mode="continuous" debug>
      <Drawing
        drawing={({ canvas }) => {
          canvas.drawScene(scene);
        }}
      />
    </Canvas>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
