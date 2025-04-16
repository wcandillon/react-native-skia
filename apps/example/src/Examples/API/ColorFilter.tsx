import React, { useMemo } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import {
  Skia,
  PaintStyle,
  useImage,
  TileMode,
  Canvas,
  Group,
  BlendColor,
  Circle,
  Image,
  Lerp,
  ColorMatrix,
  LinearToSRGBGamma,
  SRGBToLinearGamma,
  SkiaPictureView,
  createPicture,
} from "@shopify/react-native-skia";

import { Title } from "./components/Title";

const card = require("../../assets/zurich.jpg");

const paint = Skia.Paint();
paint.setAntiAlias(true);
paint.setColor(Skia.Color("#61DAFB"));

const strokePaint = paint.copy();
strokePaint.setStyle(PaintStyle.Stroke);
strokePaint.setStrokeWidth(2);

const blackAndWhite = [
  0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0,
];
const purple = [
  1, -0.2, 0, 0, 0, 0, 1, 0, -0.1, 0, 0, 1.2, 1, 0.1, 0, 0, 0, 1.7, 1, 0,
];

// TODO: use examples from https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
// Once the Path API is available.
export const ColorFilter = () => {
  const { width } = useWindowDimensions();
  const aspectRatio = 3057 / 5435;
  const IMG_WIDTH = width / 2;
  const IMG_HEIGHT = IMG_WIDTH * aspectRatio;

  const image = useImage(card);

  const matrixDraw = createPicture((canvas) => {
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
  });

  const imageFilterDraw = createPicture((canvas) => {
    const rect1 = Skia.XYWHRect(0, 0, IMG_WIDTH, IMG_HEIGHT);
    const rect2 = Skia.XYWHRect(IMG_WIDTH, 0, IMG_WIDTH, IMG_HEIGHT);
    if (image) {
      const imgRect = Skia.XYWHRect(0, 0, image.width(), image.height());
      const p1 = paint.copy();
      p1.setImageFilter(Skia.ImageFilter.MakeBlur(5, 5, TileMode.Decal, null));
      canvas.drawImageRect(image, imgRect, rect1, p1);
      const p2 = paint.copy();
      p2.setImageFilter(
        Skia.ImageFilter.MakeColorFilter(
          Skia.ColorFilter.MakeMatrix([
            1.49, 0, 0, -0.247, 0, 1.49, 0, 0, -0.247, 0, 0, 1.49, 0, -0.247, 0,
            0, 0, 1, 0,
          ]),
          null
        )
      );
      canvas.drawImageRect(image, imgRect, rect2, p2);
    }
  });

  const style = useMemo(
    () => ({ width: width, height: IMG_HEIGHT * 2 }),
    [IMG_HEIGHT, width]
  );

  const r = IMG_HEIGHT;

  return (
    <ScrollView>
      <Title>Color Matrix Filter</Title>
      <SkiaPictureView style={style} picture={matrixDraw} />
      <Title>Image Filter</Title>
      <SkiaPictureView style={style} picture={imageFilterDraw} />
      <Title>Other</Title>
      <Canvas style={style}>
        <Group>
          <SRGBToLinearGamma>
            <BlendColor color="lightblue" mode="srcIn" />
          </SRGBToLinearGamma>
          <Circle cx={r} cy={r} r={r} />
          <Circle cx={2 * r} cy={r} r={r} color="red" />
        </Group>
      </Canvas>
      <Canvas style={style}>
        <Image x={0} y={0} width={256} height={256} image={image} fit="cover">
          <LinearToSRGBGamma>
            <Lerp t={0.5}>
              <ColorMatrix matrix={purple} />
              <ColorMatrix matrix={blackAndWhite} />
            </Lerp>
          </LinearToSRGBGamma>
        </Image>
      </Canvas>
    </ScrollView>
  );
};
