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
  return (
    <Canvas style={styles.container} mode="continuous" debug>
      <Drawing
        drawing={({ canvas }) => {
          canvas.drawScene(canvas.getScene());
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
