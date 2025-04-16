import React from "react";
import { Text, StyleSheet } from "react-native";

interface TitleProps {
  children: string;
}

export const Title = ({ children }: TitleProps) => {
  return <Text style={styles.title}>{children}</Text>;
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 16,
    color: "black",
  },
});
