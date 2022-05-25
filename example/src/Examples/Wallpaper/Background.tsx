import type { SkiaReadonlyValue } from "@shopify/react-native-skia";
import {
  Fill,
  RadialGradient,
  vec,
  useDerivedValue,
  mixColors,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
const c = vec(width / 2, height / 2);
const r = width / 2;

interface BackgroundProps {
  progress: SkiaReadonlyValue<number>;
}

export const Background = ({ progress }: BackgroundProps) => {
  const colors = useDerivedValue(
    () => [mixColors(progress.current, "#040404", "#303030"), "#040404"],
    [progress]
  );
  return (
    <Fill>
      <RadialGradient c={c} r={r} colors={colors} />
    </Fill>
  );
};
