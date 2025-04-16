import type { SkPath } from "@shopify/react-native-skia";
import { Group, Path, vec } from "@shopify/react-native-skia";
import React from "react";

export const R = 50;

interface IconProps {
  path: SkPath;
}

export const Icon = ({ path }: IconProps) => {
  return (
    <>
      <Group
        origin={vec(12)}
        transform={[{ translateX: -12 }, { translateY: -12 }, { scale: 2 }]}
      >
        <Path path={path} color="white" />
      </Group>
    </>
  );
};
