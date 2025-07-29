import * as React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";

export const examples = [
  {
    screen: "DropInReplacement",
    title: "🪄 Drop-in Replacement",
  },
  {
    screen: "Composition", 
    title: "🪄 Composition",
  },
  {
    screen: "CustomColors",
    title: "🪄 Custom Colors",
  },
  {
    screen: "CustomTypographies",
    title: "🪄 Custom Typographies",
  },
  {
    screen: "CustomImages",
    title: "🪄 Custom Images",
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