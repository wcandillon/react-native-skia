import React, { useCallback, useMemo } from "react";
import type { SkFont } from "@shopify/react-native-skia";
import {
  Skia,
  useFont,
  useValue,
  useComputedValue,
  useImage,
} from "@shopify/react-native-skia";

import { Slider } from "./Slider";
import type { SlideModel } from "./Slide";
import { Slide } from "./Slide";

interface ContainerProps {
  slides: SlideModel[];
  font: SkFont;
}

const Container = ({ slides, font }: ContainerProps) => {
  const index = useValue(0);
  const setIndex = useCallback(
    (i: number) => {
      index.current = i;
    },
    [index]
  );
  const prev = useComputedValue(() => slides[index.current - 1], [index]);
  const current = useComputedValue(() => slides[index.current], [index]);
  const next = useComputedValue(() => slides[index.current + 1], [index]);

  return (
    <Slider
      index={index}
      setIndex={setIndex}
      prev={<Slide slide={prev} font={font} picture={slides[0].picture} />}
      next={<Slide slide={next} font={font} picture={slides[0].picture} />}
    >
      <Slide slide={current} font={font} picture={slides[0].picture} />
    </Slider>
  );
};

export const LiquidSwipe = () => {
  const img1 = useImage(require("./assets/1.png"));
  const img2 = useImage(require("./assets/5.png"));
  const img3 = useImage(require("./assets/4.png"));
  const img4 = useImage(require("./assets/2.png"));
  const img5 = useImage(require("./assets/3.png"));
  const slides = useMemo((): SlideModel[] => {
    if (!img1 || !img2 || !img3 || !img4 || !img5) {
      return [];
    }
    return [
      {
        colors: ["#F2A1AD", "#f4b3bd"].map((c) => Skia.Color(c)),
        title: "Dessert Recipes",
        description:
          "Hot or cold, our dessert recipes can turn an average meal into a memorable event",
        picture: img1,
      },
      {
        colors: ["#0090D6", "#32a6de"].map((c) => Skia.Color(c)),
        title: "Healthy Foods",
        description:
          "Discover healthy recipes that are easy to do with detailed cooking instructions from top chefs",
        picture: img2,
      },
      {
        colors: ["#69C743", "#87d268"].map((c) => Skia.Color(c)),
        title: "Easy Meal Ideas",
        description:
          "explore recipes by food type, preparation method, cuisine, country and more",
        picture: img3,
      },
      {
        colors: ["#FB3A4D", "#fb6170"].map((c) => Skia.Color(c)),
        title: "10000+ Recipes",
        description:
          "Browse thousands of curated recipes from top chefs, each with detailled cooking instructions",
        picture: img4,
      },
      {
        colors: ["#F2AD62", "#f4bd81"].map((c) => Skia.Color(c)),
        title: "Video Tutorials",
        description:
          "Browse our best themed recipes, cooking tips, and how-to food video & photos",
        picture: img5,
      },
    ];
  }, [img1, img2, img3, img4, img5]);
  const font = useFont(require("./assets/SF-Pro-Display-Bold.otf"), 32);
  if (!font || slides.length === 0) {
    return null;
  }
  return <Container slides={slides} font={font} />;
};
