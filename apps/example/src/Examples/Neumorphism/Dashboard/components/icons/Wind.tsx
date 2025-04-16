import { Group, Path } from "@shopify/react-native-skia";
import React from "react";

export const Wind = () => {
  return (
    <Group style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round">
      <Path path="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </Group>
  );
};
