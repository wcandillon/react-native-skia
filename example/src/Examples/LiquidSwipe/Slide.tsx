import type { SkFont, SkiaValue, SkImage } from "@shopify/react-native-skia";
import {
  useComputedValue,
  Fill,
  RadialGradient,
  vec,
  Image,
  Text,
} from "@shopify/react-native-skia";
import React from "react";
import { useWindowDimensions } from "react-native";

export interface SlideModel {
  colors: Float32Array[];
  title: string;
  description: string;
  picture: SkImage;
}

export interface SlideProps {
  font: SkFont;
  picture: SkImage;
  slide: SkiaValue<SlideModel | undefined>;
}

export const Slide = ({ slide, font, picture }: SlideProps) => {
  const { width, height } = useWindowDimensions();
  const SIZE = width - 150;
  const colors = useComputedValue(() => {
    if (slide.current === undefined) {
      return ["transparent", "transparent"];
    }
    return slide.current.colors;
  }, [slide]);
  const image = useComputedValue(
    () => (slide.current ?? { picture }).picture,
    [slide]
  );
  const title = useComputedValue(
    () => (slide.current ?? { title: "" }).title,
    [slide]
  );
  const x = useComputedValue(
    () =>
      slide.current && font
        ? (width - font.getTextWidth(slide.current.title)) / 2
        : 0,
    [slide]
  );

  const c = vec(width / 2, height / 2);

  return (
    <>
      <Fill>
        <RadialGradient colors={colors} c={c} r={width / 2} />
      </Fill>
      <Image
        image={image}
        x={c.x - SIZE / 2}
        y={c.y - SIZE / 2}
        width={SIZE}
        height={SIZE}
      />
      <Text
        x={x}
        y={c.y + SIZE / 2 + 20}
        text={title}
        font={font}
        color="white"
      />
    </>
  );
};
