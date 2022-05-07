import type { SkiaReadonlyValue } from "@shopify/react-native-skia";
import {
  interpolate,
  Text,
  Skia,
  useDerivedValue,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";

import type { useGraphs } from "../Model";
import { AJUSTED_SIZE, WIDTH, HEIGHT, PADDING } from "../Model";

import type { GraphState } from "./Selection";

const currency = new Intl.NumberFormat("en-EN", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
  currency: "USD",
});

interface LabelProps {
  y: SkiaReadonlyValue<number>;
  state: SkiaReadonlyValue<GraphState>;
  graphs: ReturnType<typeof useGraphs>;
}

export const Label = ({ graphs, state, y }: LabelProps) => {
  const fonts = useMemo(() => {
    const tf = Skia.FontMgr.RefDefault().matchFamilyStyle("helvetica")!;
    const titleFont = Skia.Font(tf, 64);
    const subtitleFont = Skia.Font(tf, 24);
    return {
      titleFont,
      subtitleFont,
    };
  }, []);
  const translateY = HEIGHT + PADDING;
  const text = useDerivedValue(() => {
    const graph = graphs[state.current.current];
    return currency.format(
      interpolate(
        y.current,
        [0, AJUSTED_SIZE],
        [graph.data.maxPrice, graph.data.minPrice]
      )
    );
  }, [y, state]);
  const subtitle = "+ $314,15";
  const titleX = useDerivedValue(() => {
    const graph = graphs[state.current.current];
    return (
      WIDTH / 2 -
      fonts.titleFont.measureText(currency.format(graph.data.maxPrice)).width /
        2
    );
  }, [state]);
  const subtitlePos = fonts.subtitleFont.measureText(subtitle);
  return (
    <>
      <Text
        x={titleX}
        y={translateY - 120}
        text={text}
        font={fonts.titleFont}
        color="white"
      />
      <Text
        x={WIDTH / 2 - subtitlePos.width / 2}
        y={translateY - 60}
        text={subtitle}
        font={fonts.subtitleFont}
        color="#8E8E93"
      />
    </>
  );
};
