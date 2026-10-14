import React, { useEffect, useState } from "react";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { Canvas, Fill, isOnMainThread } from "react-native-skia";

// Cyan when isOnMainThread() answers true on the UI thread and false on the JS
// thread, red for any other answer.
export const IsOnMainThread = () => {
  const [onUIThread, setOnUIThread] = useState<boolean | null>(null);
  useEffect(() => {
    scheduleOnUI(() => {
      "worklet";
      scheduleOnRN(setOnUIThread, isOnMainThread());
    });
  }, []);
  if (onUIThread === null) {
    return null;
  }
  const answeredRight = onUIThread && !isOnMainThread();
  return (
    <Canvas style={{ width: 120, height: 120 }}>
      <Fill color={answeredRight ? "cyan" : "red"} />
    </Canvas>
  );
};
