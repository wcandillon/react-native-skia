import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Canvas, Circle } from "react-native-skia";

function SkiaCircle() {
  const r = 64;

  return (
    <Canvas style={{ width: r, height: r }}>
      <Circle cx={r / 2} cy={r / 2} r={r / 2} color="blue" />
    </Canvas>
  );
}

function ViewCircle() {
  const r = 64;

  return (
    <View
      style={{
        width: r,
        height: r,
        backgroundColor: "blue",
        borderRadius: r / 2,
      }}
    />
  );
}

export function Snapshot7() {
  return (
    <SafeAreaView style={{ flex: 1, alignItems: "center" }}>
      <View
        style={{
          marginBottom: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
        }}
      >
        <Text
          style={{
            fontSize: 21,
            fontWeight: "bold",
          }}
        >
          Skia Circles
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 36 }}>
        <SkiaCircle />
        <SkiaCircle />
        <SkiaCircle />
        <SkiaCircle />
      </View>

      <View
        style={{
          marginBottom: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
        }}
      >
        <Text
          style={{
            fontSize: 21,
            fontWeight: "bold",
          }}
        >
          Regular View Circles
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <ViewCircle />
        <ViewCircle />
        <ViewCircle />
        <ViewCircle />
      </View>
    </SafeAreaView>
  );
}
