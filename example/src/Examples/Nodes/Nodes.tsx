import React from "react";
import { Dimensions } from "react-native";
import { SkiaView, useDrawCallback, Skia } from "@shopify/react-native-skia";

export const Nodes = () => {
  const onDraw = useDrawCallback((canvas) => {
    const node = Skia.Node.MakeCanvas();
    console.log({ node });
    canvas.drawNode(node);
  });
  return <SkiaView onDraw={onDraw} style={{ flex: 1 }} debug />;
};
