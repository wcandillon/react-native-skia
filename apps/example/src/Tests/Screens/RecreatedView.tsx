import React, { memo, useEffect, useState } from "react";
import { View } from "react-native";
import { Canvas, Fill } from "react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useSharedValue } from "react-native-reanimated";

import { useScreenDone } from "../ScreenDone";

// Long enough for the native side to mount, or tear down, the views of a
// commit and for a frame to be drawn.
const STEP = 500;

// Memoized, so that React leaves the canvases alone when the screen renders
// again: a canvas that renders records its scene and sends it again.
const StaticCanvas = memo(() => (
  <Canvas style={{ flex: 1 }}>
    <Fill color="red" />
  </Canvas>
));

const AnimatedCanvas = memo(({ color }: { color: SharedValue<string> }) => (
  <Canvas style={{ flex: 1 }}>
    <Fill color={color} />
  </Canvas>
));

// A static canvas (red) beside a canvas drawing a shared value (cyan), in a
// row that is hidden with display: none and shown again. Fabric can tear the
// native views of the row down while it is hidden and make new ones for the
// same canvases, which stay mounted: nothing changes for them in React, so
// no recording is sent again, and the new views draw the ones the canvases
// already made.
export const RecreatedView = () => {
  const [step, setStep] = useState(0);
  const color = useSharedValue("cyan");
  const done = useScreenDone();
  useEffect(() => {
    if (step === 2) {
      const timeout = setTimeout(done, STEP);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setStep(step + 1), STEP);
    return () => clearTimeout(timeout);
  }, [step, done]);
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          display: step === 1 ? "none" : "flex",
        }}
      >
        <StaticCanvas />
        <AnimatedCanvas color={color} />
      </View>
    </View>
  );
};
