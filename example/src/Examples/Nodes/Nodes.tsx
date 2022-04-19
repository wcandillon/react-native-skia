import React, { useEffect, useMemo, useRef } from "react";
import { Dimensions } from "react-native";
import {
  useDerivedValue,
  SkiaView,
  useDrawCallback,
  Skia,
  ValueApi,
  BlurStyle,
  useFont,
  vec,
} from "@shopify/react-native-skia";

const { width, height } = Dimensions.get("window");
const COLS = 5;
const ROWS = 10;
const SYMBOL = { width: width / COLS, height: height / ROWS };
const pos = vec(0, 0);

export const Nodes = () => {
  const font = useFont(require("../Matrix/matrix-code-nfi.otf"), SYMBOL.height);
  const ref = useRef<SkiaView>(null);
  const clock = useMemo(() => ValueApi.createClockValue(), []);
  useEffect(() => {
    clock.start();
    return ref.current?.registerValues([clock]);
  }, [clock]);
  const cx = useDerivedValue(() => clock.current / 50, [clock]);
  //
  const node = useMemo(() => {
    const root = Skia.Node.MakeCanvas({});
    const fill = Skia.Node.MakeFill({ color: "black" });
    const blurMask = Skia.Node.MakeBlurMask({
      blur: 5,
      respectCTM: true,
      style: BlurStyle.Normal,
    });
    const circle = Skia.Node.MakeCircle({
      r: 100,
      cx: cx,
      cy: cx,
      color: "lightblue",
    });
    root.appendChild(fill);
    root.appendChild(blurMask);
    root.appendChild(circle);
    if (font) {
      const symbols = font.getGlyphIDs("abcdefghijklmnopqrstuvwxyz");
      const symbol = Skia.Node.MakeGlyphs({
        color: "rgb(0, 255, 70)",
        glyphs: [{ id: symbols[0], pos }],
        font,
        x: 0,
        y: 0,
      });
      root.appendChild(symbol);
    }

    return root;
  }, [cx, font]);
  const onDraw = useDrawCallback(
    (canvas) => {
      if (node != null) {
        canvas.drawNode(node);
      }
    },
    [font]
  );
  return <SkiaView ref={ref} onDraw={onDraw} style={{ flex: 1 }} debug />;
};
