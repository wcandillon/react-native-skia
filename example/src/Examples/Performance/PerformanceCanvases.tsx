import {
  Canvas,
  Fill,
  LinearGradient,
  Skia,
  SkiaView,
  TileMode,
  useDrawCallback,
  vec,
} from "@shopify/react-native-skia";
import React, { useRef, useState, useEffect } from "react";
import { TouchableWithoutFeedback, View } from "react-native";

export const SkiaGradient = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, 0)}
          colors={["red", "cyan", "lime"]}
        />
      </Fill>
    </Canvas>
  );
};

function createPaint() {
  return Skia.Paint();
}

export const SkiaGradientImp = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  return (
    <SkiaView
      style={{ width, height }}
      onDraw={(canvas) => {
        const path = Skia.Path.Make();
        canvas.drawCB(() => {
          console.log({ path });
        });
        canvas.drawTest();
        canvas.drawCB(null);
      }}
    />
  );
};

export const PerformanceDrawingTest = () => {
  const [index, setIndex] = useState(0);
  return (
    <TouchableWithoutFeedback onPress={() => setIndex((i) => i + 1)}>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {new Array(1).fill(0).map((_, i) => (
          <SkiaGradientImp key={`${index}-${i}`} width={100} height={100} />
        ))}
      </View>
    </TouchableWithoutFeedback>
  );
};
