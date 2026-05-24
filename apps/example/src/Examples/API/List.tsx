import * as React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";

export const examples = [
  {
    screen: "Shapes",
    title: "🔺 Shapes",
  },
  {
    screen: "Images",
    title: "🏞 Images",
  },
  {
    screen: "Skottie",
    title: "🍭 Skottie",
  },
  {
    screen: "AnimatedImages",
    title: "🌅 Animated Images",
  },
  {
    screen: "ImageLoading",
    title: "🖼 Image Loading",
  },
  {
    screen: "Paragraphs",
    title: "📚 Text & Paragraphs",
  },
  {
    screen: "Paragraphs2",
    title: "📚 Text & Paragraphs 2",
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
    screen: "Snapshot",
    title: "📺 View Snapshot",
  },
  {
    screen: "SnapshotDemo",
    title: "📸 Snapshot HWUI vs Legacy",
  },
  {
    screen: "PathEffect",
    title: "⭐️ Path Effect",
  },
  {
    screen: "IconsExample",
    title: "📱 Icons",
  },
  {
    screen: "Transform",
    title: "🔄 Transformations",
  },
  {
    screen: "ZIndex",
    title: "🧱 zIndex",
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
    screen: "FontMgr",
    title: "💬 Font Manager",
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
    screen: "OnLayout",
    title: "🎛️ OnLayout",
  },
  {
    screen: "OnSize",
    title: "📏 OnSize",
  },
  {
    screen: "StressTest",
    title: "🔥 Stress Test",
  },
  {
    screen: "StressTest2",
    title: "🔥 Stress Test 2",
  },
  {
    screen: "StressTest3",
    title: "🔥 Stress Test 3",
  },
  {
    screen: "StressTest4",
    title: "🔥 Stress Test 4",
  },
  {
    screen: "PictureViewCrashTest",
    title: "💥 PictureView Race Condition",
  },
  {
    screen: "FirstFrame",
    title: "🎬 First Frame",
  },
  {
    screen: "PictureBug",
    title: "Picture Render Bug",
  },
  {
    screen: "Atlas",
    title: "🎯 Atlas",
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
            // here the examples tuple is too big
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigate(thumbnail.screen as any);
          }}
          testID={thumbnail.screen}
        >
          <View style={styles.thumbnail}>
            <Text style={styles.title}>{thumbnail.title}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
};
