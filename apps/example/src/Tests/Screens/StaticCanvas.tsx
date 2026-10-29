import React, { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { CanvasColorSpace } from "react-native-skia";
import { Canvas, Fill, Rect, Shader, Skia } from "react-native-skia";

import { useScreenDone } from "../ScreenDone";

// Cyan above and red below, each the frame of a static canvas.
export const StaticCanvas = () => (
  <View style={{ flex: 1 }}>
    <Canvas style={{ flex: 1 }} static>
      <Fill color="cyan" />
    </Canvas>
    <Canvas style={{ flex: 1 }} static>
      <Fill color="red" />
    </Canvas>
  </View>
);

// A canvas above and a static canvas below, each white on its left half and
// clear on its right, which shows its white background.
export const CanvasAboveStaticCanvas = () => {
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1, backgroundColor: "white" }}>
        <Rect x={0} y={0} width={width / 2} height={10000} color="white" />
      </Canvas>
      <Canvas style={{ flex: 1, backgroundColor: "white" }} static>
        <Rect x={0} y={0} width={width / 2} height={10000} color="white" />
      </Canvas>
    </View>
  );
};

// A shader's colours are not managed: each canvas reads these values in its
// own color space.
const unmanagedColor = Skia.RuntimeEffect.Make(`
half4 main(float2 p) {
  return half4(0.5, 0.75, 0.25, 1.0);
}`)!;

interface UnmanagedColorProps {
  readonly colorSpace: CanvasColorSpace;
  readonly static?: boolean;
}

const UnmanagedColor = (props: UnmanagedColorProps) => (
  <Canvas style={{ flex: 1 }} {...props}>
    <Fill>
      <Shader source={unmanagedColor} />
    </Fill>
  </Canvas>
);

// Canvases in sRGB on the left and in Display P3 on the right, regular ones
// above and static ones below, each filled with the shader's colour.
export const StaticCanvasColorSpace = () => (
  <View style={{ flex: 1 }}>
    <View style={{ flex: 1, flexDirection: "row" }}>
      <UnmanagedColor colorSpace="srgb" />
      <UnmanagedColor colorSpace="display-p3" />
    </View>
    <View style={{ flex: 1, flexDirection: "row" }}>
      <UnmanagedColor colorSpace="srgb" static />
      <UnmanagedColor colorSpace="display-p3" static />
    </View>
  </View>
);

const CHURNED_CANVASES = 60;
const CHURN_CYCLES = 24;

// Static canvases mounted and dropped on the next frame, over and over, so
// that the worker is still presenting some of them as React drops them; then
// one cyan static canvas that stays. The churn lasts as many frames as the
// device takes to draw them, so the screen says when it is over.
export const StaticCanvasChurn = () => {
  const [step, setStep] = useState(0);
  const done = useScreenDone();
  const churning = step < 2 * CHURN_CYCLES;
  useEffect(() => {
    if (!churning) {
      done();
      return;
    }
    const frame = requestAnimationFrame(() => setStep((value) => value + 1));
    return () => cancelAnimationFrame(frame);
  }, [churning, done, step]);
  if (!churning) {
    return (
      <Canvas style={{ flex: 1 }} static>
        <Fill color="cyan" />
      </Canvas>
    );
  }
  return (
    <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
      {step % 2 === 0
        ? Array.from({ length: CHURNED_CANVASES }, (_, index) => (
            <Canvas key={index} style={{ width: 8, height: 8 }} static>
              <Fill color="red" />
            </Canvas>
          ))
        : null}
    </View>
  );
};
