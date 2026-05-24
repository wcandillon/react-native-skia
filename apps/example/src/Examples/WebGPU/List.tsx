import * as React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";

export const examples = [
  {
    screen: "Triangle",
    title: "Triangle",
    description: "Basic WebGPU Canvas rendering",
  },
  {
    screen: "Wireframes",
    title: "Wireframes",
    description: "3D wireframe models with offscreen rendering",
  },
  {
    screen: "TexturedCube",
    title: "Textured Cube",
    description: "Rotating 3D cube with texture mapping",
  },
  {
    screen: "BlurredSheet",
    title: "Blurred Sheet",
    description:
      "WebGPU scene behind a Skia frosted bottom sheet (backdrop blur)",
  },
  {
    screen: "ClippedText",
    title: "Clipped Text",
    description: "WebGPU scene revealed through a Skia text path clip",
  },
  {
    screen: "LayeredCubes",
    title: "Layered Cubes",
    description: "WebGPU back layer, Skia text, WebGPU front layer on top",
  },
  {
    screen: "TextPlane",
    title: "Text Plane",
    description:
      "Skia text baked into a GPU texture, sampled by a 3D plane that cubes orbit through",
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
