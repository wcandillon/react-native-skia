import {
  BlurMask,
  Canvas,
  Fill,
  Glyphs,
  Group,
  useClockValue,
  useComputedArrayValue,
  useComputedValue,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { COLS, ROWS, Symbol } from "./Symbol";
import SkiaValue from '@shopify/react-native-skia';

const cols = new Array(COLS).fill(0).map((_, i) => i);
const rows = new Array(ROWS).fill(0).map((_, i) => i);

const randomArray = (from: number, to: number, blank?: boolean) => {
  const size = Math.round(from + Math.random() * (to - from));
  const a = new Array(size).fill(0).map((_, i) => (blank ? 0 : i / size));
  return a.reverse();
};

const streams = cols.map(() =>
  new Array(3)
    .fill(0)
    .map(() => [
      ...randomArray(1, 4, true),
      ...randomArray(4, 16),
      ...randomArray(2, 8, true),
    ])
    .flat()
);

const pos = vec(0, 0);

export const Matrix = () => {
  const clock = useClockValue();
  const { width, height } = useWindowDimensions();
  const symbol = { width: width / COLS, height: height / ROWS };
  const font = useFont(require("./matrix-code-nfi.otf"), symbol.height);

  const symbols = useMemo(
    () => (font ? font.getGlyphIDs("abcdefghijklmnopqrstuvwxyz") : undefined),
    [font]
  );

  // Calculate the static data
  const items = useMemo(
    () =>
      cols
        .map((_c, ci) =>
          rows.map((_r, ri) => ({
            offset: Math.round(Math.random() * (26 - 1)),
            range: 100 + Math.random() * 900,
            stream: streams[ci],
            i: ci,
            j: ri,
          }))
        )
        .flat(),
    []
  );

  const index = useComputedValue(() => Math.round(clock.current / 100), [clock]);

  const data = useComputedValue(
    () => symbols === undefined ? items.map(() => ({ color: "black", glyps: [{ id: 0, pos }] })): items.map(({ stream, j, range, offset }) => {
        const opacity =
          stream[(stream.length - j + index.current) % stream.length];
        const idx = offset + Math.floor(clock.current / range);
        const color = new Float32Array([0, 1, 70/255, opacity]);
        const glyphs = [{ id: symbols[idx % symbols.length], pos }];
        return { color, glyphs };
    }),
    [items, index, symbols]
  );
  return font ? (
    <Canvas style={{ flex: 1, marginTop: 40 }} debug>
      <Fill color="black" />
      <Group>
        <BlurMask blur={8} style="solid" />
        {items.map(({ i, j }, k) => {
         const glyphs = new Selector(data, (d) => d[k].glyphs);
         const color = new Selector(data, (d) => d[k].color);
         return (<Glyphs
         index={index}
          key={k}
          x={i * symbol.width}
          y={j * symbol.height}
          font={font}
          glyphs={glyphs}
          color={color}
        />);}
        )}
      </Group>
    </Canvas>
  ) : null;
};

class Selector{
  __typename__ = "RNSkValue2";
  constructor(private readonly data: SkiaValue, private readonly selector: (d: any) => any) {}
  get current () {
    const result = this.selector(this.data.current);
    return result;
  }
}