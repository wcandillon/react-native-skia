import React from "react";
import { useWindowDimensions } from "react-native";
import { Canvas, ImageSVG, Skia } from "@shopify/react-native-skia";

export const SVG = () => {
  const { width, height } = useWindowDimensions();
  const svg = Skia.SVG.MakeFromString(require("./tiger.svg").default);
  // useSVG(require("./tiger.svg"));
  return (
    <Canvas style={{ flex: 1 }}>
      <ImageSVG svg={svg} x={0} y={0} width={width / 2} height={height / 2} />
    </Canvas>
  );
};
