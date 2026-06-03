import React from "react";
import { StyleSheet, View } from "react-native";

import { Icon } from "./Icon";

interface CheckmarkProps {
  checked: boolean;
}

export const Checkmark = ({ checked }: CheckmarkProps) => {
  return (
    <View style={styles.box}>
      {checked && <Icon name="check" size={12} color="#979797" />}
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
});
