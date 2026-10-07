import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Canvas, RoundedRect } from "react-native-skia";

function SkiaRoundedButton() {
  const width = 96;
  const height = 48;

  return (
    <Canvas style={{ width, height }}>
      <RoundedRect
        x={0}
        y={0}
        width={width}
        height={height}
        r={12}
        color="blue"
      />
    </Canvas>
  );
}

function RoundedButton() {
  const width = 96;
  const height = 48;

  return (
    <View
      style={{ width, height, backgroundColor: "blue", borderRadius: 12 }}
    />
  );
}

export function Snapshot6() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: "center",
      }}
    >
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
          Skia Rounded Buttons
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 36 }}>
        <SkiaRoundedButton />
        <SkiaRoundedButton />
        <SkiaRoundedButton />
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
          Regular View Rounded Buttons
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <RoundedButton />
        <RoundedButton />
        <RoundedButton />
      </View>
    </SafeAreaView>
  );
}
