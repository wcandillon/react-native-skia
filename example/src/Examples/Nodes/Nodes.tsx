import React, { useEffect, useMemo, useRef } from "react";
import {
  useDerivedValue,
  SkiaView,
  useDrawCallback,
  Skia,
  ValueApi,
} from "@shopify/react-native-skia";

export const Nodes = () => {
  const ref = useRef<SkiaView>(null);
  const clock = useMemo(() => ValueApi.createClockValue(), []);
  useEffect(() => {
    clock.start();
    return ref.current?.registerValues([clock]);
  }, [clock]);
  const cx = useDerivedValue(() => clock.current / 50, [clock]);
  const node = useMemo(() => {
    const root = Skia.Node.MakeCanvas({});
    const fill = Skia.Node.MakeFill({ color: "black" });
    const circle = Skia.Node.MakeCircle({
      r: 100,
      cx: cx,
      cy: cx,
      color: "lightblue",
    });
    root.appendChild(fill);
    root.appendChild(circle);
    return root;
  }, [cx]);
  const onDraw = useDrawCallback((canvas) => {
    canvas.drawNode(node);
  });
  return <SkiaView ref={ref} onDraw={onDraw} style={{ flex: 1 }} debug />;
};
