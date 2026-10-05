import React, { useState, useEffect } from "react";
import {
  Button,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Canvas, Circle, Skia, SkiaPictureView } from "react-native-skia";
import { ScrollView } from "react-native-gesture-handler";

import { AnimationWithTouchHandler } from "../Reanimated/AnimationWithTouchHandler";

import type { Routes } from "./Routes";

const red = Skia.PictureRecorder();
const canvas = red.beginRecording(Skia.XYWHRect(0, 0, 200, 200));
const paint = Skia.Paint();
paint.setColor(Skia.Color("green"));
canvas.drawCircle(100, 100, 50, paint);
const picture = red.finishRecordingAsPicture();

export const FirstFrame = () => {
  const { width } = useWindowDimensions();
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const navigation =
    useNavigation<NativeStackNavigationProp<Routes, "FirstFrame">>();

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setCount((value) => value + 1);
      }, 200);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [isRunning]);

  return (
    <ScrollView>
      <View style={styles.container}>
        <Button
          onPress={() => setIsRunning((prev) => !prev)}
          title={isRunning ? "PAUSE" : "START"}
        />
        <Text>{count}</Text>
        <SkiaPictureView
          key={`picture-${count}`}
          picture={picture}
          style={styles.canvas}
        />
        <Canvas style={styles.canvas} key={`canvas-${count}`}>
          <Circle cx={100} cy={100} r={50} color="red" />
        </Canvas>
        <View style={{ width, height: 100 }}>
          <AnimationWithTouchHandler />
        </View>
        <Button
          title="Go to empty screen"
          onPress={() => navigation.navigate("FirstFrameEmpty")}
        />
      </View>
    </ScrollView>
  );
};

export const FirstFrameEmpty = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<Routes, "FirstFrameEmpty">>();

  return (
    <View style={styles.container}>
      <Text>Empty screen</Text>
      <Button title="Go back" onPress={() => navigation.goBack()} />
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
