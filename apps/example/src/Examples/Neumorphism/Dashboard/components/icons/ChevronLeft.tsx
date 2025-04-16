import React from "react";
import { Group, Points, vec } from "@shopify/react-native-skia";

export const ChervronLeft = () => {
  return (
    <Group style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round">
      <Points points={[vec(15, 18), vec(9, 12), vec(15, 6)]} mode="polygon" />
    </Group>
  );
};
