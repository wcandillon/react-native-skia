import React from "react";
import { SkiaView, useDrawCallback, Skia } from "@shopify/react-native-skia";

export const Nodes = () => {
  const onDraw = useDrawCallback((canvas) => {
    const paint = Skia.Paint();
    paint.setColor(0xff00ffff);
    const node = Skia.Node.MakeCanvas();
    const circle = Skia.Node.MakeCircle({
      paint,
      r: 100,
      cx: 200,
      cy: 200,
    });
    node.appendChild(circle);
    canvas.drawNode(node);
  });
  return <SkiaView onDraw={onDraw} style={{ flex: 1 }} debug />;
};
