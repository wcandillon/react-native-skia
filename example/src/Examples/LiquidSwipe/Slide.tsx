import type { SkiaValue, SkImage } from "@shopify/react-native-skia";
import {
  useComputedValue,
  Fill,
  RadialGradient,
  useImage,
  vec,
  Image,
  useFont,
  Text,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("screen");
const SIZE = width - 150;

export interface SlideProps {
  slide: SkiaValue<
    | {
        colors: [string, string];
        title: string;
        description: string;
        picture: SkImage | null;
      }
    | undefined
  >;
}

export const Slide = ({ slide }: SlideProps) => {
  const titleFont = useFont(require("./assets/SF-Pro-Display-Bold.otf"), 32);
  const colors = useComputedValue(() => {
    if (slide.current === undefined) {
      return ["transparent", "transparent"];
    }
    return slide.current.colors;
  }, [slide]);
  //  const image = useComputedValue(() => slide.current.picture, [slide]);
  // const title = useComputedValue(() => slide.current.title, [slide]);
  // const x = useComputedValue(
  //   () =>
  //     (width - (titleFont ? titleFont.getTextWidth(slide.current.title) : 0)) /
  //     2,
  //   [slide]
  // );

  const c = vec(width / 2, height / 2);
  if (!titleFont) {
    return null;
  }
  return (
    <>
      <Fill>
        <RadialGradient colors={colors} c={c} r={width / 2} />
      </Fill>
      {/* <Image
        image={image}
        x={c.x - SIZE / 2}
        y={c.y - SIZE / 2}
        width={SIZE}
        height={SIZE}
      />
      <Text x={x} y={c.y + 200} text={title} font={titleFont} color="white" /> */}
    </>
  );
};
