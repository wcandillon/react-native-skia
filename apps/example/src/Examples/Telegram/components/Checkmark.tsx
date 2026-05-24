import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CheckmarkProps {
  checked: boolean;
}

export const Checkmark = ({ checked }: CheckmarkProps) => {
  return (
    <View style={styles.box}>
      {checked && <Text style={styles.check}>✓</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderColor: "#979797",
    borderWidth: 2,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  check: {
    color: "#979797",
    fontSize: 10,
    lineHeight: 10,
    fontWeight: "700",
  },
});
