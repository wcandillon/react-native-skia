import * as React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";

const examples = [
  {
    screen: "Shapes",
    title: "🔺 Shapes",
  },
  {
    screen: "Images",
    title: "🏞 Images",
  },
  {
    screen: "Clipping",
    title: "✂️ & 🎭 Clipping & Masking",
  },
  {
    screen: "Touch",
    title: "🖱 Touch Handling",
  },
  {
    screen: "PathEffect",
    title: "⭐️ Path Effect",
  },
  {
    screen: "Transform",
    title: "🔄 Transformations",
  },
  {
    screen: "ColorFilter",
    title: "🌃 Color Filters",
  },
  {
    screen: "ImageFilters",
    title: "💧 Image Filters",
  },
  {
    screen: "Gradients",
    title: "🌈 Gradients",
  },
  {
    screen: "Path",
    title: "🥾 Paths",
  },
  {
    screen: "SVG",
    title: "🖋 SVG",
  },
  {
    screen: "BlendModes",
    title: "🎨 Blend Modes",
  },
  {
    screen: "Data",
    title: "📊 Data",
  },
  {
    screen: "PictureView",
    title: "🖼 Picture View",
  },
  {
    screen: "Picture",
    title: "🖼 Picture",
  },
  {
    screen: "Checker",
    title: "🏁 Checker",
  },
  {
    screen: "UseCanvas",
    title: "↕️ useCanvas()",
  },
  {
    screen: "Reanimated",
    title: "🐎 Reanimated",
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
  },
});

export const List = () => {
  const { navigate } =
    useNavigation<NativeStackNavigationProp<Routes, "List">>();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {examples.map((thumbnail) => (
        <Pressable
          key={thumbnail.screen}
          onPress={() => {
            navigate(thumbnail.screen);
          }}
        >
          <View style={styles.thumbnail}>
            <Text style={styles.title}>{thumbnail.title}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
};
