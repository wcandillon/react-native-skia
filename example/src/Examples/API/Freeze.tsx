import React from "react";
import {
  useFont,
  Canvas,
  Group,
  Rect,
  Text,
  useClockValue,
  useComputedValue,
} from "@shopify/react-native-skia";

const size = 200;
const n = 49;

export const FreezeExample = () => {
  const font = useFont(require("../../assets/SF-Mono-Semibold.otf"), 32);
  const clock = useClockValue();
  const transform = useComputedValue(
    () => [{ translateY: 100 }, { rotate: (Math.PI * clock.current) / 4000 }],
    [clock]
  );

  if (font === null) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1, margin: 50 }}>
      <Group origin={{ x: size / 2, y: size / 2 }} transform={transform}>
        <Checkerboard color="black" />
      </Group>
      {font && <Text x={20} y={size + 100} text={`n = ${n * n}`} font={font} />}
    </Canvas>
  );
};

const Checkerboard = ({ color }: { color: string }) => {
  // draw a n * n checkerboard
  return (
    <>
      {[...Array(n * n)].map((_, i) => (
        <Rect
          key={i}
          x={((i % n) * size) / n}
          y={(Math.floor(i / n) * size) / n}
          width={size / n}
          height={size / n}
          color={i % 2 ? color : "#ddd"}
        />
      ))}
    </>
  );
};
