import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";

import { Interpolation } from "./Interpolation";
import { Slider } from "./Slider";

const Padding = 10;

export const GraphsScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.container}>
      <Interpolation height={height * 0.25} width={width - Padding * 2} />
      <Slider height={height * 0.25} width={width - Padding * 2} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Padding,
  },
});
