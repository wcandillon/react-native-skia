import React, { useRef } from "react";
import { Canvas, Fill, useGpu } from "react-native-skia";

// Cyan, then red once useGpu() reports that the device was replaced.
export const GpuReplacement = () => {
  const gpu = useGpu();
  const first = useRef(gpu);
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color={gpu === first.current ? "cyan" : "red"} />
    </Canvas>
  );
};
