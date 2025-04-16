import React from "react";
import {
  View,
  StyleSheet,
  Button,
  Text,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Canvas, RoundedRect, Image, Skia } from "@shopify/react-native-skia";
import { Switch } from "react-native-gesture-handler";

export const Snapshot2 = () => {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.view}>
        <Component />
      </View>
    </View>
  );
};

const Component = () => {
  return (
    <ScrollView style={styles.scrollview}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 200,
          height: 200,
        }}
      >
        <View
          style={{
            position: "absolute",
            transform: [{ translateX: 20 }, { translateY: 100 }],
            top: 0,
            left: 0,
            width: 80,
            height: 80,
            backgroundColor: "red",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 100,
            left: 100,
            width: 80,
            height: 80,
            backgroundColor: "blue",
          }}
        />
      </View>
      <Text>Hello World!</Text>
      <View style={{ flexDirection: "row" }}>
        <View
          style={{
            width: 80,
            height: 80,
            backgroundColor: "blue",
            opacity: 0.5,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              backgroundColor: "green",
              opacity: 0.5,
            }}
          />
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            backgroundColor: "red",
            opacity: 0.5,
            overflow: "hidden",
          }}
        >
          <View style={{ width: 150, height: 10, backgroundColor: "cyan" }}>
            <View style={{ width: 20, height: 20, backgroundColor: "red" }} />
          </View>
        </View>
      </View>
      <Button
        title={"Press me to increment (" + 1 + ")"}
        onPress={() => true}
      />
      <Switch value={true} />
      <Canvas style={{ width: 100, height: 100 }}>
        <RoundedRect x={0} y={20} width={80} height={80} r={10} color="blue" />
      </Canvas>
      <Text>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;👆 This is a Skia Canvas!</Text>
      <Interleaving />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  view: {
    flex: 1,
    backgroundColor: "yellow",
  },
  scrollview: {
    padding: 14,
  },
  pinkContainer: {
    backgroundColor: "#00ff6922",
    position: "absolute",
    alignSelf: "center",
    left: 50,
    top: 50,
    right: 50,
    bottom: 50,
  },
  integratingContainer: {
    position: "absolute",
    left: "25%",
    top: 0,
    bottom: 0,
    transform: [{ scale: 0.5 }],
  },
  salmonContainer: {
    backgroundColor: "#ff8c6922",
    position: "absolute",
    alignSelf: "center",
    padding: 20,
    marginTop: 80,
  },
  black: {
    color: "black",
    textAlign: "center",
  },
  innerContainer: {
    backgroundColor: "#ff8c0044",
    transform: [{ translateX: 50 }, { rotate: "45deg" }],
  },
});

const image = Skia.Image.MakeImageFromEncoded(
  Skia.Data.fromBase64(
    "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"
  )
);

const Interleaving = () => {
  const { height, width } = useWindowDimensions();

  return (
    <View style={styles.integratingContainer}>
      <View style={styles.pinkContainer} />
      <Canvas style={{ width, height }}>
        <Image
          image={image}
          height={height}
          width={width}
          fit={"cover"}
          opacity={0.5}
        />
      </Canvas>
      <View style={styles.salmonContainer}>
        <Text style={styles.black}>Let me be a part of your snapshot!</Text>
        <View style={styles.innerContainer}>
          <Text style={styles.black}>I'm inside the red thingie!</Text>
        </View>
      </View>
    </View>
  );
};
