import React, { useEffect } from "react";
import { Canvas, Picture, Skia } from "react-native-skia";
import {
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const size = 256;
const n = 20;

const paint = Skia.Paint();

export const Pictures = () => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);
  }, [progress]);

  const picture = useDerivedValue(() => {
    "worklet";
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, size, size));
    const angle = progress.value * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const alpha = Math.pow((i + 1) / n, 5) * 200;
      const r = ((i + 1) / n) * (size / 4);
      const offset = ((i + 1) / n) * (size / 4);
      const cx = size / 2 + Math.cos(angle + (i * Math.PI * 2) / n) * offset;
      const cy = size / 2 + Math.sin(angle + (i * Math.PI * 2) / n) * offset;
      paint.setColor(Skia.Color(`rgba(0, 122, 255, ${alpha / 255})`));
      canvas.drawCircle(cx, cy, r, paint);
    }
    return recorder.finishRecordingAsPicture();
  });

  return (
    <Canvas style={{ flex: 1 }}>
      <Picture picture={picture} />
    </Canvas>
  );
};
