import React from "react";
import { View } from "react-native";

export const Snapshot1 = () => {
  return (
    <View style={{ flex: 1, backgroundColor: "cyan", padding: 16 }}>
      <View
        style={{
          width: 100,
          height: 100,
          backgroundColor: "magenta",
          borderRadius: 10,
          borderWidth: 4,
          borderColor: "yellow",
        }}
      />
    </View>
  );
};
