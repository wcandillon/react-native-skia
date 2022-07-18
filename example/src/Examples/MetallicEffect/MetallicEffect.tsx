import { Canvas, Fill } from "@shopify/react-native-skia";
import React from "react";

import { Card } from "./Card";

export const MetallicEffect = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="white" />
      <Card scheme="pastel" />
    </Canvas>
  );
};
