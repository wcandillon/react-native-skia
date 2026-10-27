import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Canvas, Fill, Rect } from "react-native-skia";

const SMALL = 60;
const LARGE = 120;
const STEP = 6;

// A canvas that grows (or shrinks) a few points per frame from one size to
// another once mounted, so that its presents race its resizes, and settles.
// Red, with a 20 point green square at its origin: a stale frame stretched to
// the new size would show a larger (or smaller) square, so the square tells
// that the frame shown was recorded for the size the canvas settled at. Cyan
// wherever the canvas does not reach.
const ResizingCanvas = ({ from, to }: { from: number; to: number }) => {
  const [size, setSize] = useState(from);
  useEffect(() => {
    let current = from;
    let frame = 0;
    const step = () => {
      current =
        from < to ? Math.min(current + STEP, to) : Math.max(current - STEP, to);
      setSize(current);
      if (current !== to) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to]);
  return (
    <View style={{ width: LARGE, height: LARGE, backgroundColor: "cyan" }}>
      <Canvas style={{ width: size, height: size }}>
        <Fill color="red" />
        <Rect x={0} y={0} width={20} height={20} color="lime" />
      </Canvas>
    </View>
  );
};

export const ResizeGrow = () => <ResizingCanvas from={SMALL} to={LARGE} />;

export const ResizeShrink = () => <ResizingCanvas from={LARGE} to={SMALL} />;
