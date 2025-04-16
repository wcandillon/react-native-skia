import { Group, Circle, Line, vec } from "@shopify/react-native-skia";
import React from "react";

export const Sun = () => {
  return (
    <Group strokeWidth={2} strokeCap="round" strokeJoin="round" style="stroke">
      <Circle cx={12} cy={12} r={5} />
      <Line p1={vec(12, 1)} p2={vec(12, 3)} />
      <Line p1={vec(12, 21)} p2={vec(12, 23)} />
      <Line p1={vec(4.22, 4.22)} p2={vec(5.64, 5.64)} />
      <Line p1={vec(18.36, 18.36)} p2={vec(20, 20)} />
      <Line p1={vec(1, 12)} p2={vec(3, 12)} />
      <Line p1={vec(21, 12)} p2={vec(23, 12)} />
      <Line p1={vec(4.22, 20)} p2={vec(5, 18)} />
      <Line p1={vec(18, 5)} p2={vec(20, 4)} />
    </Group>
  );
};
