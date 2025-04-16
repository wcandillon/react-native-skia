import type { SkImage, Matrix4 } from "@shopify/react-native-skia";
import { Group, Image, rect } from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";
import type { SharedValue } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
export const PictureDimensions = rect(0, 0, width, height);

interface PictureProps {
  matrix: SharedValue<Matrix4>;
  image: SkImage;
}

export const Picture = ({ matrix, image }: PictureProps) => {
  return (
    <Group matrix={matrix}>
      <Image
        x={0}
        y={0}
        width={width}
        height={height}
        image={image}
        fit="cover"
      />
    </Group>
  );
};
