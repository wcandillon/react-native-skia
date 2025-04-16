import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export const Snapshot5 = () => {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.view}>
        <Component />
      </View>
    </View>
  );
};

const Component = () => {
  const [r, setRender] = useState(0);
  console.log({ r });
  return (
    <>
      <ScrollView
        style={styles.scrollview}
        ref={(ref) => {
          ref?.scrollTo({ y: 200 });
          setRender((p) => p + 1);
        }}
      >
        <View style={[styles.verticalBox, { backgroundColor: "cyan" }]} />
        <View style={[styles.verticalBox, { backgroundColor: "red" }]} />
        <View style={[styles.verticalBox, { backgroundColor: "green" }]} />
      </ScrollView>

      <ScrollView
        style={styles.scrollViewHorizontal}
        horizontal
        ref={(ref) => {
          ref?.scrollTo({ x: 200 });
          setRender((p) => p + 1);
        }}
      >
        <View style={[styles.horizontalBox, { backgroundColor: "cyan" }]} />
        <View style={[styles.horizontalBox, { backgroundColor: "red" }]} />
        <View style={[styles.horizontalBox, { backgroundColor: "green" }]} />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  view: {
    flex: 1,
    backgroundColor: "yellow",
  },
  scrollview: {
    padding: 14,
    paddingTop: 100,
    maxHeight: 150,
  },
  scrollViewHorizontal: {
    padding: 14,
    paddingTop: 100,
    maxHeight: 150,
  },
  verticalBox: {
    flex: 1,
    minHeight: 500,
    borderWidth: 5,
  },
  horizontalBox: {
    width: 200,
    height: "100%",
    borderWidth: 5,
  },
});
