import React from "react";
import { StyleSheet, View } from "react-native";
import type { SkPicture } from "@shopify/react-native-skia";
import {
  Group,
  Fill,
  Canvas,
  Picture,
  Skia,
  PaintStyle,
} from "@shopify/react-native-skia";
import type { TouchData } from "react-native-gesture-handler";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";

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

const rec = Skia.PictureRecorder();
rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
const emptyPicture = rec.finishRecordingAsPicture();

const paint = Skia.Paint();
paint.setColor(Skia.Color("cyan"));
paint.setStyle(PaintStyle.Stroke);
paint.setStrokeWidth(10);

const drawTouches = (touches: TouchData[], colors: string[]) => {
  "worklet";
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(0, 0, 2_000_000, 2_000_000)
  );
  touches.forEach((touch) => {
    const p = paint.copy();
    p.setColor(Skia.Color(colors[touch.id % colors.length]));
    canvas.drawCircle(touch.x, touch.y, 50, p);
  });
  return recorder.finishRecordingAsPicture();
};

export const Touch = () => {
  const picture = useSharedValue<SkPicture>(emptyPicture);
  const colors = useSharedValue<string[]>([]);
  const gesture = Gesture.Native()
    .onTouchesDown((event) => {
      const start = Math.round(Math.random() * 4);
      colors.value = Colors.slice(start, start + event.allTouches.length);
      picture.value = drawTouches(event.allTouches, colors.value);
    })
    .onTouchesMove((event) => {
      picture.value = drawTouches(event.allTouches, colors.value);
    })
    .onTouchesUp(() => {
      picture.value = emptyPicture;
    });
  return (
    <View style={styles.container}>
      <Title>Touch handling</Title>
      <View style={{ flex: 1 }}>
        <GestureDetector gesture={gesture}>
          <Canvas style={styles.container}>
            <Fill color="white" />
            <Group style="stroke" strokeWidth={8}>
              <Picture picture={picture} />
            </Group>
          </Canvas>
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
