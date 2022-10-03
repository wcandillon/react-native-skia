import type { ReactNode } from "react";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export const Size = 20;
export const Padding = 10;

export const AnimationDemo: React.FC<{
  title: string;
  children: ReactNode | ReactNode[];
}> = ({ title, children }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: Padding / 2,
  },
  text: {
    fontWeight: "bold",
    marginBottom: 8,
    color: "black",
  },
});
