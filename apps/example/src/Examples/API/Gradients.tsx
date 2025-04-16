import React, { useMemo } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import {
  bottomRight,
  center,
  topLeft,
  Skia,
  rect,
  Canvas,
  Rect,
  LinearGradient,
  RadialGradient,
  TwoPointConicalGradient,
  SweepGradient,
  vec,
  Turbulence,
  ColorShader,
  Blend,
} from "@shopify/react-native-skia";

import { BilinearGradient } from "../Aurora/components/BilinearGradient";

const paint = Skia.Paint();
paint.setAntiAlias(true);

export const Gradients = () => {
  const { width } = useWindowDimensions();
  const SIZE = width / 2;
  const R = SIZE / 2;

  const r1 = useMemo(() => rect(0, 0, SIZE, SIZE), [SIZE]);
  const r2 = useMemo(() => rect(SIZE, 0, SIZE, SIZE), [SIZE]);
  const r3 = useMemo(() => rect(0, SIZE, SIZE, SIZE), [SIZE]);
  const r4 = useMemo(() => rect(SIZE, SIZE, SIZE, SIZE), [SIZE]);
  const r5 = useMemo(() => rect(0, 2 * SIZE, SIZE, SIZE), [SIZE]);
  const r6 = useMemo(() => rect(SIZE, 2 * SIZE, SIZE, SIZE), [SIZE]);
  const r7 = useMemo(() => rect(0, 3 * SIZE, SIZE, SIZE), [SIZE]);

  return (
    <ScrollView>
      <Canvas style={{ width: SIZE * 2, height: SIZE * 4 }}>
        <Rect rect={r1}>
          <LinearGradient
            start={topLeft(r1)}
            end={bottomRight(r1)}
            colors={["#61DAFB", "#fb61da"]}
          />
        </Rect>

        <Rect rect={r2}>
          <RadialGradient
            c={center(r2)}
            r={SIZE / 2}
            colors={["#fb61da", "#61DAFB"]}
          />
        </Rect>

        <Rect rect={r3}>
          <TwoPointConicalGradient
            start={vec(R, SIZE)}
            startR={R}
            end={vec(R, R)}
            endR={R}
            colors={["#61DAFB", "#fb61da"]}
          />
        </Rect>

        <Rect rect={r4}>
          <SweepGradient
            c={vec(SIZE + R, SIZE + R)}
            colors={["#61DAFB", "#fb61da", "#dafb61", "#61DAFB"]}
          />
        </Rect>
        <Rect rect={r5}>
          <Blend mode="difference">
            <ColorShader color="#61DAFB" />
            <Turbulence freqX={0.05} freqY={0.05} octaves={4} />
          </Blend>
        </Rect>
        <Rect rect={r6}>
          <BilinearGradient
            rect={r6}
            colors={["#dafb61", "#61DAFB", "#fb61da", "#61fbcf"]}
          />
        </Rect>
        <Rect rect={r7}>
          <LinearGradient
            start={topLeft(r7)}
            end={bottomRight(r7)}
            colors={["#dafb61", "#61DAFB", "#fb61da"]}
            positions={[0, 0.85, 1]}
          />
        </Rect>
      </Canvas>
    </ScrollView>
  );
};
