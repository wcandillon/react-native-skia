import * as React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";

export const examples = [
  {
    screen: "Helmet",
    title: "Damaged Helmet",
    description: "glTF model with HDR environment map (three.js + WebGPU)",
  },
  {
    screen: "HelmetBackdrop",
    title: "Helmet Controls",
    description:
      "Same helmet, rendered through a Skia frosted bottom sheet with gamepad-style controls",
  },
] as const;

const styles = StyleSheet.create({
  container: {},
  content: {
    paddingBottom: 32,
  },
  thumbnail: {
    backgroundColor: "white",
    padding: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  description: {
    color: "#666",
    fontSize: 14,
    marginTop: 4,
  },
});

export const List = () => {
  const { navigate } =
    useNavigation<NativeStackNavigationProp<Routes, "List">>();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {examples.map((example) => (
        <Pressable
          key={example.screen}
          onPress={() => {
            navigate(example.screen as keyof Routes);
          }}
          testID={example.screen}
        >
          <View style={styles.thumbnail}>
            <Text style={styles.title}>{example.title}</Text>
            <Text style={styles.description}>{example.description}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
};
