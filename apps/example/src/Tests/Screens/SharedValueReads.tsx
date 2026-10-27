import React, { useEffect, useState } from "react";
import { View } from "react-native";
import type { SkImage } from "react-native-skia";
import { Canvas, Fill, Image, Rect, useCanvasRef } from "react-native-skia";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";

const width = 120;
const height = 40;

// Three canvases, 120x40 each, stacked:
// 1. a red rect as wide as a shared value, added once the canvas is laid out
//    (a while after onLayout, which precedes the native layout: a snapshot
//    needs the view's surface) and snapshotted right after the commit that
//    adds it, while the UI thread is held so that the mapper cannot have read
//    the shared value yet: the snapshot reads it itself. The Skia commit is a
//    scheduler task after the React commit, hence the delay before the
//    snapshot;
// 2. that snapshot, drawn: as much red again when the snapshot drew the
//    current value, white when it drew the previous frame;
// 3. a blue rect as wide as a shared value that holds an invalid value when
//    the canvas mounts (reported, not fatal: the canvas stays blank) and a
//    valid one 100 ms later, which draws it.
export const SharedValueReads = () => {
  const ref = useCanvasRef();
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<SkImage | null>(null);
  const redWidth = useSharedValue(width);
  const blueWidth = useSharedValue<number>(undefined as unknown as number);
  useEffect(() => {
    if (!ready) {
      return;
    }
    const timer = setTimeout(() => {
      if (ref.current) {
        setSnapshot(ref.current.makeImageSnapshot());
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [ready, ref]);
  useEffect(() => {
    const timer = setTimeout(() => {
      blueWidth.value = width;
    }, 100);
    return () => clearTimeout(timer);
  }, [blueWidth]);
  const [laidOut, setLaidOut] = useState(false);
  useEffect(() => {
    if (!laidOut) {
      return;
    }
    const timer = setTimeout(() => {
      scheduleOnUI(() => {
        "worklet";
        const end = Date.now() + 400;
        while (Date.now() < end) {
          // Holds the UI thread: no mapper runs before the snapshot.
        }
      });
      setReady(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [laidOut]);
  return (
    <View style={{ width, height: height * 3 }}>
      <Canvas
        ref={ref}
        style={{ width, height }}
        onLayout={() => setLaidOut(true)}
      >
        <Fill color="white" />
        {ready ? (
          <Rect x={0} y={0} width={redWidth} height={height} color="red" />
        ) : null}
      </Canvas>
      <Canvas style={{ width, height }}>
        <Fill color="white" />
        {snapshot !== null ? (
          <Image image={snapshot} x={0} y={0} width={width} height={height} />
        ) : null}
      </Canvas>
      <Canvas style={{ width, height }}>
        <Fill color="white" />
        <Rect x={0} y={0} width={blueWidth} height={height} color="blue" />
      </Canvas>
    </View>
  );
};
