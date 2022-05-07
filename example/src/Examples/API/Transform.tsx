import React from "react";
import { StyleSheet, Dimensions, ScrollView } from "react-native";
import {
  Skia,
  useDrawCallback,
  SkiaView,
  useImage,
  usePaint,
} from "@shopify/react-native-skia";

import { Title } from "./components/Title";

const card = require("../../assets/card.png");

const { width } = Dimensions.get("window");
const SIZE = width;
const center = { x: SIZE / 2, y: SIZE / 2 };
const aspectRatio = 836 / 1324;
const CARD_WIDTH = width - 64;
const CARD_HEIGHT = CARD_WIDTH * aspectRatio;

// TODO: use examples from https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
// Once the Path API is available.
export const Transform = () => {
  const image = useImage(card);

  const paint = usePaint((p) => {
    p.setAntiAlias(true);
    p.setColor(Skia.Color("#61DAFB"));
  });

  const onRotateDraw = useDrawCallback(
    (canvas) => {
      const rect = Skia.XYWHRect(
        center.x - CARD_WIDTH / 2,
        center.y - CARD_HEIGHT / 2,
        CARD_WIDTH,
        CARD_HEIGHT
      );
      if (image) {
        const imgRect = Skia.XYWHRect(0, 0, image.width(), image.height());
        canvas.save();
        canvas.rotate(-30, center.x, center.y);

        //  we pivot on the center of the card
        canvas.translate(center.x, center.y);
        canvas.scale(0.75, 0.75);
        canvas.translate(-center.x, -center.y);

        canvas.drawImageRect(image, imgRect, rect, paint);
        canvas.restore();
      }
    },
    [image]
  );

  const onSkewDraw = useDrawCallback(
    (canvas) => {
      const rect = Skia.XYWHRect(
        center.x - CARD_WIDTH / 2,
        center.y - CARD_HEIGHT / 2,
        CARD_WIDTH,
        CARD_HEIGHT
      );
      if (image) {
        const imgRect = Skia.XYWHRect(0, 0, image.width(), image.height());
        canvas.save();

        //  we pivot on the center of the card
        canvas.translate(center.x, center.y);
        canvas.skew(-Math.PI / 6, 0);
        canvas.translate(-center.x, -center.y);

        canvas.drawImageRect(image, imgRect, rect, paint);
        canvas.restore();
      }
    },
    [image]
  );

  const onMatrixDraw = useDrawCallback(
    (canvas) => {
      const rect = Skia.XYWHRect(
        center.x - CARD_WIDTH / 2,
        center.y - CARD_HEIGHT / 2,
        CARD_WIDTH,
        CARD_HEIGHT
      );
      if (image) {
        const imgRect = Skia.XYWHRect(0, 0, image.width(), image.height());
        canvas.save();

        //  we pivot on the center of the card
        canvas.translate(center.x, center.y);
        canvas.skew(-Math.PI / 6, 0);
        canvas.translate(-center.x, -center.y);

        canvas.drawImageRect(image, imgRect, rect, paint);
        canvas.restore();
      }
    },
    [image]
  );

  return (
    <ScrollView>
      <Title>Rotate & Scale</Title>
      <SkiaView style={styles.container} onDraw={onRotateDraw} />
      <Title>Skew</Title>
      <SkiaView style={styles.container} onDraw={onSkewDraw} />
      <Title>Matrix</Title>
      <SkiaView style={styles.container} onDraw={onMatrixDraw} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
  },
});
