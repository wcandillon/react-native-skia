import { Canvas } from "@shopify/react-native-skia";
import React from "react";

import { Card } from "./Card";

export const MetalicEffect = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Card />
    </Canvas>
  );
};
