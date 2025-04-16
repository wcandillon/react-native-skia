import type { SkPath } from "@shopify/react-native-skia";
import {
  Canvas,
  Circle,
  Path,
  Skia,
  useCanvasRef,
} from "@shopify/react-native-skia";
import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View, Text, Image } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { runOnJS, useSharedValue } from "react-native-reanimated";

import { WINDOW_WIDTH } from "../constants";

import { INPUT_HEIGHT } from "./ChatInput";

type DrawingOverlayProps = {
  onSend: (path: string) => void;
  onCancel: () => void;
};

export function DrawingOverlay({ onSend, onCancel }: DrawingOverlayProps) {
  const insets = useSafeAreaInsets();

  const canvasRef = useCanvasRef();
  const [paths, setPaths] = useState<string[]>([]);

  const savePath = (path: string) => {
    setPaths((prev) => [...prev, path]);
  };

  const currentPath = useSharedValue<SkPath>(Skia.Path.Make());
  const updatePoint = useSharedValue(0);

  const handleSend = () => {
    // just for testing purposes
    const snapshotForBounds = canvasRef.current?.makeImageSnapshot();

    if (snapshotForBounds) {
      const actualSnapshot = canvasRef.current?.makeImageSnapshot();
      // rect(0, 0, WINDOW_WIDTH, WINDOW_WIDTH)

      if (actualSnapshot) {
        const base64 = actualSnapshot.encodeToBase64();

        if (base64) {
          onSend(base64);
        }
      }
    }
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart((evt) => {
          updatePoint.value = evt.x + evt.y;

          currentPath.value.reset();
          currentPath.value.moveTo(evt.x, evt.y);
        })
        .onChange((evt) => {
          updatePoint.value = evt.x + evt.y;

          currentPath.value.lineTo(evt.x, evt.y);
        })
        .onEnd((evt) => {
          updatePoint.value = evt.x + evt.y;

          currentPath.value.lineTo(evt.x, evt.y);

          const path = currentPath.value.toSVGString();

          currentPath.value.reset();

          runOnJS(savePath)(path);
        }),
    [currentPath, updatePoint]
  );

  return (
    <View style={[styles.overlay, styles.container]}>
      <GestureDetector gesture={panGesture}>
        <Canvas ref={canvasRef} style={styles.canvas}>
          {paths.map((path, index) => (
            <Path key={index} path={path} style="stroke" strokeWidth={2} />
          ))}

          <Path path={currentPath} style="stroke" strokeWidth={2} />

          <Circle cx={updatePoint} cy={updatePoint} r={1} color="transparent" />
        </Canvas>
      </GestureDetector>

      <View
        style={[
          styles.toolbar,
          {
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cancelButton}
          activeOpacity={0.8}
          onPress={onCancel}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sendButton}
          activeOpacity={0.8}
          onPress={handleSend}
        >
          <Image
            source={require("../../../assets/send.png")}
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const buttonSize = INPUT_HEIGHT - 8;

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    borderWidth: 1,
    borderColor: "black",
    width: WINDOW_WIDTH,
    height: WINDOW_WIDTH,
  },

  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 4,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  buttonText: {
    color: "white",
  },
  sendButton: {
    height: buttonSize,
    width: buttonSize,
    backgroundColor: "#007AFF",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    height: buttonSize,
    width: buttonSize,
    backgroundColor: "black",
    borderRadius: 50,
  },
  icon: {
    width: 20,
    height: 20,
    right: 1,
    tintColor: "white",
  },
});
