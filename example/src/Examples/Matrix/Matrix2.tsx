import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import {
  Skia,
  SkiaReadonlyValue,
  Drawing,
  Canvas,
} from "@shopify/react-native-skia";

const { width, height } = Dimensions.get("window");
const COLS = 20;
const ROWS = 40;
const SYMBOL = { width: width / COLS, height: height / ROWS };

const bg = Skia.Node.MakeColor(0xff000000);
const plane = Skia.Node.MakePlane();
const draw = Skia.Node.MakeDraw(plane, bg);
const rct = Skia.Node.MakeRect(Skia.XYWHRect(0, 0, 100, 100));
const rctPaint = Skia.Node.MakeColor(0xff00ff00);
const group = Skia.Node.MakeGroup();
group.addChild(draw);
group.addChild(Skia.Node.MakeDraw(rct, rctPaint));
const scene = Skia.Node.MakeScene(group);

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
