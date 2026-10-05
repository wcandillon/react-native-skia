import type { Dispatch, SetStateAction } from "react";
import React, { useState, useRef, useEffect } from "react";
import { Button, ScrollView, StyleSheet } from "react-native";
import type { SkImage, SkPicture } from "react-native-skia";
import { Canvas, Skia, usePictureAsTexture } from "react-native-skia";
import {
  runOnJS,
  runOnUI,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import { useQuietReanimatedLogger } from "./useQuietReanimatedLogger";

const makeTexture = (content: SharedValue<SkImage | null>) => {
  "worklet";

  const texture = Skia.Surface.MakeOffscreen(400, 400)!;
  const canvas = texture.getCanvas();
  for (let i = 0; i < 1000; i++) {
    const paint = Skia.Paint();
    paint.setColor(
      Float32Array.from([Math.random(), Math.random(), Math.random(), 1])
    );

    const x = (i % 20) * 20;
    const y = Math.floor(i / 20) * 8;

    canvas.drawCircle(x, y, 3, paint);
  }
  content.value = texture.makeImageSnapshot();
};

const createPictureWithGPUResources = (
  content: SharedValue<SkImage | null>,
  setPicture: Dispatch<SetStateAction<SkPicture | null>>
) => {
  "worklet";
  makeTexture(content);
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, 400, 400));
  if (content.value) {
    canvas.drawImage(content.value, 0, 0);
  }
  const result = rec.finishRecordingAsPicture();
  runOnJS(setPicture)(result);
};

export const StressTest3 = () => {
  useQuietReanimatedLogger();
  const content = useSharedValue<SkImage | null>(null);
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const texture = usePictureAsTexture(picture, {
    width: 400,
    height: 400,
  });

  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<unknown>(-1);

  useEffect(() => {
    return () => {
      // Cleanup interval on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current as number);
      }
    };
  }, []);

  const startStressTest = () => {
    if (isRunning) return;

    setIsRunning(true);

    // Use setInterval to rapidly update the picture, triggering React re-renders
    intervalRef.current = setInterval(() => {
      runOnUI(createPictureWithGPUResources)(content, setPicture);
    }, 32) as unknown; // ~60fps to stress the system and trigger the race condition
  };

  const stopStressTest = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current as number);
    }
    setIsRunning(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Canvas
        style={{
          width: 400,
          height: 400,
          borderColor: "red",
          borderWidth: 2,
        }}
      >
        {/* Use Image with texture as described in crash scenario */}
      </Canvas>
      <RasterCanvas image={texture} />
      <Button
        onPress={isRunning ? stopStressTest : startStressTest}
        title={
          isRunning
            ? "Stop GPU Resource Crash Test"
            : "Start GPU Resource Crash Test"
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

interface FrameProps {
  image: SharedValue<SkImage | null>;
}

const frame = ({ image }: FrameProps) => {
  const surface = Skia.Surface.MakeOffscreen(400, 400)!;
  const canvas = surface.getCanvas();
  if (image.value) {
    canvas.drawImage(image.value.makeNonTextureImage()!, 0, 0);
  }
  surface.flush();
  surface.makeImageSnapshot();
  requestAnimationFrame(() => frame({ image }));
};

const RasterCanvas = (props: FrameProps) => {
  useEffect(() => {
    frame(props);
  }, [props]);
  return null;
};
