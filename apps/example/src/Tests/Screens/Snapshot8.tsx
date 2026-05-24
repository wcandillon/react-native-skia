import React from "react";
import { View } from "react-native";

// Padding propagation: the magenta square should sit at (32, 32) inside the
// root view. On Android the recursive traversal in ViewScreenshotService
// adds the root view's paddingLeft/paddingTop to the canvas translation a
// second time (Android already positioned the child inside the padding via
// child.getLeft()), so the square renders shifted by an extra (32, 32).
export const Snapshot8 = () => {
  return (
    <View style={{ flex: 1, padding: 32, backgroundColor: "white" }}>
      <View style={{ width: 80, height: 80, backgroundColor: "magenta" }} />
    </View>
  );
};
