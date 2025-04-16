import React from "react";
import { Dimensions } from "react-native";
import {
  Canvas,
  Fill,
  ImageShader,
  rect,
  useImage,
} from "@shopify/react-native-skia";

import { HueRotation } from "./HueRotation";

const { width, height } = Dimensions.get("window");

export const Transitions = () => {
  const image = useImage(require("./assets/product.png"));
  if (!image) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill>
        <HueRotation>
          <ImageShader
            image={image}
            fit="contain"
            rect={rect(0, 0, width, height)}
          />
        </HueRotation>
      </Fill>
    </Canvas>
  );
};
