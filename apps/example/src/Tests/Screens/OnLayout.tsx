import React, { useState } from "react";
import type { LayoutRectangle } from "react-native";
import { View } from "react-native";
import { Canvas, Fill, Rect } from "react-native-skia";

// Cyan wherever the red rect, as large as the layout onLayout reports, does not
// reach.
export const OnLayout = () => {
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  return (
    <View style={{ width: 120, height: 120 }}>
      <Canvas
        style={{ flex: 1 }}
        onLayout={(event) => setLayout(event.nativeEvent.layout)}
      >
        <Fill color="cyan" />
        {layout !== null ? (
          <Rect
            x={0}
            y={0}
            width={layout.width}
            height={layout.height}
            color="red"
          />
        ) : null}
      </Canvas>
    </View>
  );
};
