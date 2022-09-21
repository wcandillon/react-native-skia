import {
  Canvas,
  Fill,
  ImageShader,
  rect,
  useImage,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const Riveo = () => {
  const oslo = useImage(require("../../assets/oslo.jpg"));
  if (oslo === null) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill>
        <ImageShader
          image={oslo}
          fit="cover"
          rect={rect(0, 0, width, height)}
        />
      </Fill>
    </Canvas>
  );
};
