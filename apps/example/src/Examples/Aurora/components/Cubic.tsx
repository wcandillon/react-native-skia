import React from "react";
import type { CubicBezierHandle } from "@shopify/react-native-skia";
import { Line, Paint, Circle } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

import { symmetric } from "./Math";

interface CubicProps {
  mesh: SharedValue<CubicBezierHandle[]>;
  index: number;
  color: string;
}

export const Cubic = ({ mesh, index, color }: CubicProps) => {
  const c1 = useDerivedValue(() => mesh.value[index].c1, [mesh]);
  const c1S = useDerivedValue(
    () => symmetric(mesh.value[index].c1, mesh.value[index].pos),
    [mesh]
  );
  const c2 = useDerivedValue(() => mesh.value[index].c2, [mesh]);
  const c2S = useDerivedValue(
    () => symmetric(mesh.value[index].c2, mesh.value[index].pos),
    [mesh]
  );
  const pos = useDerivedValue(() => mesh.value[index].pos, [mesh]);
  return (
    <>
      <Line strokeWidth={2} color="white" p1={c1} p2={c1S} />
      <Line strokeWidth={2} color="white" p1={c2} p2={c2S} />
      <Circle c={pos} r={16} color={color}>
        <Paint style="stroke" strokeWidth={4} color="white" />
      </Circle>
      <Circle c={c1} r={10} color="white" />
      <Circle c={c2} r={10} color="white" />
      <Circle c={c1S} r={10} color="white" />
      <Circle c={c2S} r={10} color="white" />
    </>
  );
};
