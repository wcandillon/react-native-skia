import type { RefObject } from "react";
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Button,
  Text,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import type { SkImage } from "@shopify/react-native-skia";
import {
  Canvas,
  Fill,
  Skia,
  RoundedRect,
  makeImageFromView,
  mix,
  Shader,
  ImageShader,
  useImage,
  Image,
} from "@shopify/react-native-skia";
import { Switch } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { useLoop } from "../../components/Animations";

const source = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float r;

half4 main(float2 xy) {   
  xy.x += sin(xy.y / r) * 4;
  return image.eval(xy).rgba;
}`)!;

export const Snapshot = () => {
  const { width } = useWindowDimensions();
  const viewRef = useRef<View>(null);

  const progress = useLoop({ duration: 1500 });
  const uniforms = useDerivedValue(
    () => ({ r: mix(progress.value, 1, 100) }),
    [progress]
  );

  const image = useSharedValue<SkImage | null>(null);
  const takeSnapshot = useCallback(async () => {
    if (viewRef.current != null) {
      image.value = await makeImageFromView(viewRef as RefObject<View>);
    }
  }, [image]);

  return (
    <View style={{ flex: 1 }}>
      <View ref={viewRef} style={styles.view}>
        <Component />
      </View>
      <Button title="Take snapshot" onPress={takeSnapshot} />
      <Canvas style={styles.canvas}>
        <Fill color="white" />
        <Fill>
          <Shader source={source} uniforms={uniforms}>
            <ImageShader
              image={image}
              fit="contain"
              x={0}
              y={0}
              width={width}
              height={width}
            />
          </Shader>
        </Fill>
      </Canvas>
    </View>
  );
};

const Component = () => {
  const [counter, setCounter] = useState(0);
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
        title={"Press me to increment (" + counter + ")"}
        onPress={() => setCounter((i) => i + 1)}
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
  canvas: {
    flex: 1,
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

const PUPPY_TO_MAKE_YOUR_DAY_BETTER =
  "https://images.squarespace-cdn.com/content/v1/54e7a1a6e4b08db9da801ded/7f2dae36-5650-4b84-b184-684f46fe68aa/98.jpg";

const Interleaving = () => {
  const { height, width } = useWindowDimensions();
  const image = useImage(PUPPY_TO_MAKE_YOUR_DAY_BETTER);

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
