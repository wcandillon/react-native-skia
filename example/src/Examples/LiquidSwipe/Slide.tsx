import { Fill, RadialGradient, useImage, vec, Image, useFont, Text } from "@shopify/react-native-skia";
import Color from "color";
import React from "react";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("screen");
const SIZE = width - 150;

export interface SlideProps {
  slide: {
    color: string;
    title: string;
    description: string;
    picture: ReturnType<typeof require>;
  };
}

export const Slide = ({
  slide: { picture, color, title },
}: SlideProps) => {
  const titleFont = useFont(require("./assets/SF-Pro-Display-Bold.otf"), 32);
  const lighterColor = Color(color).lighten(0.8).toString();
  const image = useImage(picture);
  const c = vec(width/2, height/2);
  if (!image || !titleFont) {
    return null;
  }
  return (
    <>
      <Fill>
        <RadialGradient colors={[lighterColor, color]} c={c}  r={width/2} />
      </Fill>
      <Image image={image} x={c.x-SIZE/2} y={c.y-SIZE/2} width={SIZE} height={SIZE} />
      <Text x={(width-titleFont.getTextWidth(title))/2} y={c.y+200} text={title} font={titleFont} color="white" />
    </>
  );
};
