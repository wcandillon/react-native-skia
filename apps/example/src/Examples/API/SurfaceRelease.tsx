import React, { useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { SkSurface } from "react-native-skia";
import { Skia } from "react-native-skia";
import { scheduleOnUI } from "react-native-worklets";

// Surfaces made on the JS thread and disposed in a worklet. Read GL mtrack
// (adb shell dumpsys meminfo) after each tap: the surface the second tap makes
// takes the memory of the three disposed ones, so GL mtrack does not grow.

// 256 MB a surface.
const SIDE = 8192;

const makeSurface = () => {
  const surface = Skia.Surface.MakeOffscreen(SIDE, SIDE)!;
  surface.getCanvas().clear(Skia.Color("cyan"));
  surface.flush();
  return surface;
};

const disposeOnUI = (surfaces: SkSurface[]) => {
  "worklet";
  surfaces.forEach((surface) => surface.dispose());
};

export const SurfaceRelease = () => {
  const kept = useRef<SkSurface[]>([]);
  const [status, setStatus] = useState("");
  return (
    <View style={styles.container}>
      <Button
        title="1. Make three surfaces, dispose them in a worklet"
        onPress={() => {
          scheduleOnUI(disposeOnUI, [
            makeSurface(),
            makeSurface(),
            makeSurface(),
          ]);
          setStatus("Three surfaces disposed on the UI thread");
        }}
      />
      <Button
        title="2. Make one more surface"
        onPress={() => {
          kept.current.push(makeSurface());
          setStatus("One more surface made on the JS thread");
        }}
      />
      <Text>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", gap: 16, padding: 16 },
});
