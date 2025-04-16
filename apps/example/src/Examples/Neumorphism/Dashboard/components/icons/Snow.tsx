import { Group, Path, Line, vec } from "@shopify/react-native-skia";
import React from "react";

export const Snow = () => {
  return (
    <Group strokeCap="round" strokeJoin="round" strokeWidth={2} style="stroke">
      <Path path="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
      <Line p1={vec(8, 16)} p2={vec(8.01, 16)} />
      <Line p1={vec(8, 20)} p2={vec(8.01, 20)} />
      <Line p1={vec(12, 18)} p2={vec(12, 18)} />
      <Line p1={vec(12, 22)} p2={vec(12, 22)} />
      <Line p1={vec(16, 16)} p2={vec(16, 16)} />
      <Line p1={vec(16, 20)} p2={vec(16, 20)} />
    </Group>
  );
};
