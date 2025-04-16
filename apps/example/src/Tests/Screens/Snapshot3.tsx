import React from "react";
import { View } from "react-native";

export const Snapshot3 = () => {
  return (
    <View
      style={{
        margin: 40,
        borderRadius: 40,
        overflow: "hidden",
      }}
    >
      <View style={{ backgroundColor: "blue", height: 100 }} />
      <View style={{ backgroundColor: "green", height: 200 }} />
    </View>
  );
};
