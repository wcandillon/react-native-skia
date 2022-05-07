import React from "react";
import { StyleSheet, Dimensions, ScrollView } from "react-native";
import {
  Skia,
  useDrawCallback,
  SkiaView,
  useImage,
  TileMode,
  usePaint,
} from "@shopify/react-native-skia";

import { Title } from "./components/Title";

const card = require("../../assets/zurich.jpg");

const { width } = Dimensions.get("window");
const aspectRatio = 3057 / 5435;
const IMG_WIDTH = width / 2;
const IMG_HEIGHT = IMG_WIDTH * aspectRatio;

// TODO: use examples from https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
// Once the Path API is available.
export const ColorFilter = () => {
  const image = useImage(card);

  const paint = usePaint((p) => {
    p.setAntiAlias(true);
    p.setColor(Skia.Color("#61DAFB"));
  });

  const onMatrixDraw = useDrawCallback(
    (canvas) => {
      const rect1 = Skia.XYWHRect(0, 0, IMG_WIDTH, IMG_HEIGHT);
      const rect2 = Skia.XYWHRect(IMG_WIDTH, 0, IMG_WIDTH, IMG_HEIGHT);
      const rect3 = Skia.XYWHRect(0, IMG_HEIGHT, IMG_WIDTH, IMG_HEIGHT);
      const rect4 = Skia.XYWHRect(IMG_WIDTH, IMG_HEIGHT, IMG_WIDTH, IMG_HEIGHT);
      if (image) {
        const imgRect = Skia.XYWHRect(0, 0, image.width(), image.height());
        canvas.drawImageRect(image, imgRect, rect1, paint);
        const p2 = paint.copy();
        p2.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            -0.578, 0.99, 0.588, 0, 0, 0.469, 0.535, -0.003, 0, 0, 0.015, 1.69,
            -0.703, 0, 0, 0, 0, 0, 1, 0,
          ])
        );
        canvas.drawImageRect(image, imgRect, rect2, p2);
        const p3 = paint.copy();
        p3.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            1, 0, 0, 0, 0.262, 0, 1, 0, 0, 0.262, 0, 0, 1, 0, 0.262, 0, 0, 0, 1,
            0,
          ])
        );
        canvas.drawImageRect(image, imgRect, rect3, p3);
        const p4 = paint.copy();
        p4.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            0.393, 0.768, 0.188, 0, 0, 0.349, 0.685, 0.167, 0, 0, 0.272, 0.533,
            0.13, 0, 0, 0, 0, 0, 1, 0,
          ])
        );
        canvas.drawImageRect(image, imgRect, rect4, p4);
      }
    },
    [image]
  );

  const onImageFilterDraw = useDrawCallback(
    (canvas) => {
      const rect1 = Skia.XYWHRect(0, 0, IMG_WIDTH, IMG_HEIGHT);
      const rect2 = Skia.XYWHRect(IMG_WIDTH, 0, IMG_WIDTH, IMG_HEIGHT);
      if (image) {
        const imgRect = Skia.XYWHRect(0, 0, image.width(), image.height());
        const p1 = paint.copy();
        p1.setImageFilter(
          Skia.ImageFilter.MakeBlur(5, 5, TileMode.Decal, null)
        );
        canvas.drawImageRect(image, imgRect, rect1, p1);
        const p2 = paint.copy();
        p2.setImageFilter(
          Skia.ImageFilter.MakeColorFilter(
            Skia.ColorFilter.MakeMatrix([
              1.49, 0, 0, -0.247, 0, 1.49, 0, 0, -0.247, 0, 0, 1.49, 0, -0.247,
              0, 0, 0, 1, 0,
            ]),
            null
          )
        );
        canvas.drawImageRect(image, imgRect, rect2, p2);
      }
    },
    [image]
  );
  return (
    <ScrollView>
      <Title>Color Matrix Filter</Title>
      <SkiaView style={styles.container} onDraw={onMatrixDraw} />
      <Title>Image Filter</Title>
      <SkiaView style={styles.container} onDraw={onImageFilterDraw} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: IMG_HEIGHT * 2,
  },
});
