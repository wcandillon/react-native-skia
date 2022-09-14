import React, { useMemo } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import {
  Skia,
  useDrawCallback,
  SkiaView,
  PaintStyle,
  useImage,
} from "@shopify/react-native-skia";

import { Title } from "./components/Title";

const card = require("../../assets/card.png");

const paint = Skia.Paint();
paint.setAntiAlias(true);
paint.setColor(Skia.Color("#61DAFB"));

const strokePaint = paint.copy();
strokePaint.setStyle(PaintStyle.Stroke);
strokePaint.setStrokeWidth(2);

// TODO: use examples from https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
// Once the Path API is available.
export const Transform = () => {
  const image = useImage(card);

  const { width } = useWindowDimensions();
  const SIZE = width;
  const center = useMemo(() => ({ x: SIZE / 2, y: SIZE / 2 }), [SIZE]);
  const aspectRatio = 836 / 1324;
  const CARD_WIDTH = width - 64;
  const CARD_HEIGHT = CARD_WIDTH * aspectRatio;

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
    [CARD_HEIGHT, CARD_WIDTH, center.x, center.y, image]
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
    [CARD_HEIGHT, CARD_WIDTH, center.x, center.y, image]
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
    [CARD_HEIGHT, CARD_WIDTH, center.x, center.y, image]
  );

  const onMatrixDraw2 = useDrawCallback(
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
        const radians = -Math.PI / 2;
        const scaleX = Math.cos(radians);
        const skewX = Math.sin(radians);
        const transX = 400;
        const skewY = -Math.sin(radians);
        const scaleY = Math.cos(radians);
        const transY = 0;
        const pers0 = 0;
        const pers1 = 0;
        const pers2 = 1;
        const m = Skia.Matrix([
          scaleX,
          skewX,
          transX,
          skewY,
          scaleY,
          transY,
          pers0,
          pers1,
          pers2,
        ]);
        //console.log({ matrix: m.get() });
        canvas.concat(m);

        canvas.drawImageRect(image, imgRect, rect, paint);
        canvas.restore();
      }
    },
    [image]
  );
  const style = useMemo(() => ({ width: SIZE, height: SIZE }), [SIZE]);

  return (
    <ScrollView>
      <Title>Rotate & Scale</Title>
      <SkiaView style={style} onDraw={onRotateDraw} />
      <Title>Skew</Title>
      <SkiaView style={style} onDraw={onSkewDraw} />
      <Title>Matrix</Title>
      <SkiaView style={style} onDraw={onMatrixDraw} />
      <Title>Matrix 2</Title>
      <SkiaView style={style} onDraw={onMatrixDraw2} />
    </ScrollView>
  );
};
