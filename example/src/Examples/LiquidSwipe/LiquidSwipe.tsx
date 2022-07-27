import React, { useCallback } from "react";
import type { SkImage } from "@shopify/react-native-skia";
import {
  useValue,
  useComputedValue,
  useImage,
} from "@shopify/react-native-skia";

import { Slider } from "./Slider";
import { Slide } from "./Slide";

interface SlideModel {
  colors: [string, string];
  title: string;
  description: string;
  picture: SkImage | null;
}

export const LiquidSwipe = () => {
  const img1 = useImage(require("./assets/1.png"));
  const img2 = useImage(require("./assets/5.png"));
  const img3 = useImage(require("./assets/4.png"));
  const img4 = useImage(require("./assets/2.png"));
  const img5 = useImage(require("./assets/3.png"));
  const slides: SlideModel[] = [
    {
      colors: ["#F2A1AD", "#f4b3bd"],
      title: "Dessert Recipes",
      description:
        "Hot or cold, our dessert recipes can turn an average meal into a memorable event",
      picture: img1,
    },
    {
      colors: ["#0090D6", "#32a6de"],
      title: "Healthy Foods",
      description:
        "Discover healthy recipes that are easy to do with detailed cooking instructions from top chefs",
      picture: img2,
    },
    {
      colors: ["#69C743", "#87d268"],
      title: "Easy Meal Ideas",
      description:
        "explore recipes by food type, preparation method, cuisine, country and more",
      picture: img3,
    },
    {
      colors: ["#FB3A4D", "#fb6170"],
      title: "10000+ Recipes",
      description:
        "Browse thousands of curated recipes from top chefs, each with detailled cooking instructions",
      picture: img4,
    },
    {
      colors: ["#F2AD62", "#f4bd81"],
      title: "Video Tutorials",
      description:
        "Browse our best themed recipes, cooking tips, and how-to food video & photos",
      picture: img5,
    },
  ];
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
      prev={<Slide slide={prev} />}
      next={<Slide slide={next} />}
    >
      <Slide slide={current} />
    </Slider>
  );
};
