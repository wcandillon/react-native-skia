import React, { useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import {
  PaintStyle,
  Skia,
  SkiaView,
  useClockValue,
  useDrawCallback,
  useDerivedSkiaValue,
} from "@shopify/react-native-skia";

export const PerformanceDrawingTest = () => {
  const { width } = useWindowDimensions();
  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color("green"));
    p.setStyle(PaintStyle.Fill);
    return p;
  }, []);

  const clock = useClockValue(); // Readonly Value
  const radius = useDerivedSkiaValue(() => {
    "worklet";
    const c = clock;
    const a = (c.current / 1000) % 1;
    return 1 * (1 - a) + 5 * a; // mix(a.current, 1, 10);
  }, [clock]); // Derived Value

  const onDraw = useDrawCallback(
    (canvas) => {
      "worklet";
      const r = radius;
      canvas.drawRect(Skia.XYWHRect(0, 0, r.current, r.current), paint);
    },
    [paint]
  );

  const [key, setKey] = useState(0);

  return (
    <View
      onTouchEnd={() => setKey(key + 1)}
      style={{
        width,
        height: 250,
        marginTop: 50,
        flexWrap: "wrap",
        backgroundColor: "yellow",
      }}
    >
      {new Array(50).fill(0).map((_, i) => (
        <SkiaView
          mode="continuous"
          key={key + "_" + i.toString()}
          style={{ width: 20, height: 20 }}
          onDraw={onDraw}
        />
      ))}
    </View>
  );
};
