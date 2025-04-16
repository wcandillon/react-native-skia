import type { Vector } from "@shopify/react-native-skia";
import { Path } from "@shopify/react-native-skia";
import React from "react";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

const f = ({ x, y }: Vector) => [x, y].join(",");

interface TrianglesProps {
  vertices: SharedValue<Vector[]>;
  triangles: [number, number, number][];
}

export const Triangles = ({ vertices, triangles }: TrianglesProps) => {
  const path = useDerivedValue(() => {
    return triangles
      .map(([a, b, c]) => {
        const v1 = vertices.value[a];
        const v2 = vertices.value[b];
        const v3 = vertices.value[c];
        return `M${f(v1)} L${f(v2)} L${f(v3)} Z`;
      })
      .join("");
  }, [vertices]);

  return <Path path={path} strokeWidth={1} color="white" style="stroke" />;
};
