import React from "react";
import { View } from "react-native";

// Elevation/shadow: React Native maps `elevation` (and shadow* props on
// modern Android) to native shadow rendering, which requires HWUI's hardware
// canvas. The current Android implementation draws into a software
// `Canvas(Bitmap)`, which silently drops elevation shadows.
export const Snapshot9 = () => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 100,
          height: 100,
          backgroundColor: "white",
          elevation: 12,
          shadowColor: "black",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        }}
      />
    </View>
  );
};
