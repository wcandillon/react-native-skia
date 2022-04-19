import React from "react";
import { SkiaView, useDrawCallback, Skia } from "@shopify/react-native-skia";

export const Nodes = () => {
  const onDraw = useDrawCallback((canvas) => {
    const node = Skia.Node.MakeCanvas();
    const circle = Skia.Node.MakeCircle();
    node.appendChild(circle);
    canvas.drawNode(node);
  });
  return <SkiaView onDraw={onDraw} style={{ flex: 1 }} debug />;
};
