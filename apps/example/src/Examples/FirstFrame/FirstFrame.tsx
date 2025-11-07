import React, { useState, useEffect } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import {
  Canvas,
  Circle,
  Skia,
  SkiaPictureView,
} from "@shopify/react-native-skia";

const red = Skia.PictureRecorder();
const canvas = red.beginRecording(Skia.XYWHRect(0, 0, 200, 200));
const paint = Skia.Paint();
paint.setColor(Skia.Color("red"));
canvas.drawCircle(100, 100, 50, paint);
const picture = red.finishRecordingAsPicture();

export const FirstFrame = () => {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setCount((value) => value + 1);
      }, 100); // 16ms = 60 times per second

      return () => clearInterval(interval);
    }
    return undefined;
  }, [isRunning]);

  return (
    <View style={styles.container}>
      <Button
        // onPress={() => setIsRunning((prev) => !prev)}
        onPress={() => setCount((prev) => prev + 1)}
        title={isRunning ? "PAUSE" : "START"}
      />
      <Text>{count}</Text>
      <SkiaPictureView
        picture={picture}
        style={styles.canvas}
        key={count}
      ></SkiaPictureView>
      {/* <Canvas style={styles.canvas} key={count}>
        <Circle cx={100} cy={100} r={50} color="red" />
      </Canvas> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  canvas: {
    width: 200,
    height: 200,
    backgroundColor: "lightblue",
  },
});
