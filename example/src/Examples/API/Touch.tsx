import React, { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type {
  DrawingContext,
  SkColor,
  TouchInfo,
} from "@shopify/react-native-skia";
import {
  Group,
  useMultiTouchHandler,
  Fill,
  Canvas,
  Drawing,
  Skia,
  TouchType,
} from "@shopify/react-native-skia";

import { Title } from "./components/Title";

const Colors = [
  "#2D4CD2",
  "#3CF2B5",
  "#A80DD8",
  "#36B6D9",
  "#37FF5E",
  "#CF0CAA",
  "#AFF12D",
  "#D35127",
  "#D01252",
  "#DABC2D",
  "#5819D7",
] as const;

export const Touch = () => {
  // Store current touches together with their color
  const currentTouches = useRef<Array<TouchInfo & { color: SkColor }>>([]);

  const handleTouches = useMultiTouchHandler({
    onStart: (t) => {
      // Add specific color to the given touch (tracked by touch.id)
      const color = Skia.Color(
        Colors[Math.round(Math.random() * (Colors.length - 1))]
      );
      currentTouches.current.push({ ...t, color });
    },
    onActive: (t) => {
      // Updated the touch with the new position
      const index = currentTouches.current.findIndex((p) => p.id === t.id);
      if (index >= 0) {
        currentTouches.current[index] = {
          ...currentTouches.current[index],
          ...t,
        };
      }
    },
    onEnd: (t) => {
      // Remove the touch from the list of touch/colors
      currentTouches.current = currentTouches.current.filter(
        (p) => p.id !== t.id
      );
    },
  });

  const handleDraw = useCallback(({ canvas, paint }: DrawingContext) => {
    // Draw an indicator for all of the active touches. Each touch
    // event will request a new redraw of the view, so the ref will
    // always contain the correct current touches.
    currentTouches.current.forEach((t) => {
      if (t.type === TouchType.Active || t.type === TouchType.Start) {
        paint.setColor(t.color);
        canvas.drawCircle(t.x, t.y, 40, paint);
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <Title>Touch handling</Title>
      <Canvas style={styles.container} onTouch={handleTouches}>
        <Fill color="white" />
        <Group style="stroke" strokeWidth={8}>
          <Drawing drawing={handleDraw} />
        </Group>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
