import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import {
  Skia,
  Drawing,
  Canvas,
  useClockValue,
} from "@shopify/react-native-skia";

const { width, height } = Dimensions.get("window");
const COLS = 20;
const ROWS = 40;
const SYMBOL = { width: width / COLS, height: height / ROWS };

const bg = Skia.Node.MakeColor(0xff000000);
const plane = Skia.Node.MakePlane();
const draw = Skia.Node.MakeDraw(plane, bg.to());
const rct = Skia.Node.MakeRect(Skia.XYWHRect(0, 0, 100, 100));
const rctPaint = Skia.Node.MakeColor(0xff00ff00);
const group = Skia.Node.MakeGroup();
group.addChild(draw);
const r = Skia.Node.MakeDraw(rct.to(), rctPaint.to());
const o = Skia.Node.MakeOpacityEffect(r, 0);
group.addChild(o.to());
const scene = Skia.Node.MakeScene(group);

export const Matrix = () => {
  const clock = useClockValue();
  return (
    <Canvas style={styles.container} mode="continuous" debug>
      <Drawing
        drawing={({ canvas }) => {
          const x = clock.current / 50;
          rct.setL(x);
          rct.setR(x + 100);
          rct.setT(x);
          rct.setB(x + 100);
          o.setOpacity((clock.current % 1000) / 1000);
          rctPaint.setColor(
            Skia.Color(`rgb(100, ${clock.current % 255}, 200)`)
          );
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
