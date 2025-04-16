import React, { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import cdt2d from "cdt2d";
import {
  Canvas,
  vec,
  Vertices,
  Skia,
  isEdge,
  useClock,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { createNoise2D } from "../../components/SimpleNoise";

const N = 3;
const n = new Array(N + 1).fill(0).map((_, i) => i);

const F = 5000;
const palette = ["#61DAFB", "#fb61da", "#dafb61", "#61fbcf"];

export const Demo = () => {
  const { width, height } = useWindowDimensions();

  const win = useMemo(
    () => Skia.XYWHRect(0, 0, width, height),
    [height, width]
  );

  const hSize = width / N;
  const vSize = height / N;
  const AX = hSize * 0.45;
  const AY = vSize * 0.45;

  const defaultVertices = useMemo(() => {
    return n.map((col) => n.map((row) => vec(col * hSize, row * vSize))).flat();
  }, [hSize, vSize]);

  const triangles = useMemo(
    () => cdt2d(defaultVertices.map(({ x, y }) => [x, y])),
    [defaultVertices]
  );

  const indices = useMemo(() => triangles.flat(), [triangles]);
  const colors = useMemo(
    () => indices.map((i) => palette[i % palette.length]),
    [indices]
  );

  const clock = useClock();
  const noises = useMemo(
    () => defaultVertices.map(() => createNoise2D()),
    [defaultVertices]
  );

  const vertices = useDerivedValue(
    () =>
      defaultVertices.map((vertex, i) => {
        if (isEdge(vertex, win)) {
          return vertex;
        }
        const noise2d = noises[i];
        return {
          x: vertex.x + AX * noise2d(clock.value / F, 0),
          y: vertex.y + AY * noise2d(0, clock.value / F),
        };
      }),
    [clock]
  );

  return (
    <Canvas style={{ width, height }}>
      <Vertices
        vertices={vertices}
        indices={indices}
        textures={defaultVertices}
        colors={colors}
      />
      {/* <Points points={vertices} style="stroke" color="white" strokeWidth={1} />
      <Triangles vertices={vertices} triangles={triangles} /> */}
    </Canvas>
  );
};
