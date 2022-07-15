import { Canvas, Fill } from "@shopify/react-native-skia";
import React from "react";

import { Card } from "./Card";

export const MetalicEffect = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="#020203" />
      <Card />
    </Canvas>
  );
};
