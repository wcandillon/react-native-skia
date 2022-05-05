import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import {
  Skia,
  SkiaReadonlyValue,
  Drawing,
  Canvas,
} from "@shopify/react-native-skia";

const { width, height } = Dimensions.get("window");

const color = Skia.Node.MakeColor(0xffadd8e6);
const plane = Skia.Node.MakePlane();
const draw = Skia.Node.MakeDraw(plane, color);
const scene = Skia.Node.MakeScene(draw);

export const Matrix = () => {
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
