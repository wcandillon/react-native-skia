import {
  Canvas,
  Group,
  LinearGradient,
  Fill,
  vec,
  Rect,
  interpolate,
  Mask,
  Shadow,
  Turbulence,
} from "@shopify/react-native-skia";
import React from "react";
import { useWindowDimensions } from "react-native";

const length = 9;
const STRIPES = new Array(length).fill(0).map((_, i) => i);

export const Wallpaper = () => {
  const { height, width: wWidth } = useWindowDimensions();
  const width = wWidth / length;
  const origin = vec(width / 2, height / 2);
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={["#1A0049", "#2F0604"]}
        />
      </Fill>
      <Group>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={["#5a3ec3", "#eba5c5", "#e1d4b7", "#e9b74c", "#cf1403"]}
        />
        <Shadow dx={10} dy={0} blur={20} color="rgba(0, 0, 0, 0.8)" />
        {STRIPES.map((i) => (
          <Group
            key={i}
            origin={origin}
            transform={[
              { translateX: i * width },
              {
                scaleY: interpolate(
                  i,
                  [0, (length - 1) / 2, length - 1],
                  [1, 0.6, 1]
                ),
              },
            ]}
          >
            <Mask
              mask={
                <Group>
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, height)}
                    positions={[0, 0.1, 0.9, 1]}
                    colors={["transparent", "black", "black", "transparent"]}
                  />
                  <Shadow dx={10} dy={0} blur={20} color="black" />
                  <Rect x={0} y={0} width={width} height={height} />
                </Group>
              }
            >
              <Rect x={0} y={0} width={width} height={height} />
            </Mask>
          </Group>
        ))}
      </Group>
      <Fill blendMode="softLight">
        <Turbulence freqX={1} freqY={1} octaves={3} />
      </Fill>
    </Canvas>
  );
};
