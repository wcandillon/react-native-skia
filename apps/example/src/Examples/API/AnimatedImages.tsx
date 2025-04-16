import React from "react";
import { Pressable, ScrollView, useWindowDimensions } from "react-native";
import {
  Canvas,
  Image,
  useAnimatedImageValue,
} from "@shopify/react-native-skia";
import { useSharedValue } from "react-native-reanimated";

export const AnimatedImages = () => {
  const { width: wWidth } = useWindowDimensions();
  const SIZE = wWidth / 3;
  const S2 = 60;
  const PAD = (SIZE - S2) / 2;

  const pause = useSharedValue(false);
  const example1 = useAnimatedImageValue(
    require("../../assets/birdFlying.gif"),
    pause
  );
  const example2 = useAnimatedImageValue(
    require("../../assets/birdFlying2.gif")
  );

  return (
    <ScrollView>
      <Pressable onPress={() => (pause.value = !pause.value)}>
        <Canvas
          style={{
            alignSelf: "center",
            width: 320,
            height: 180,
            marginVertical: PAD,
          }}
        >
          <Image
            image={example1}
            x={0}
            y={0}
            width={320}
            height={180}
            fit="contain"
          />
        </Canvas>
        <Canvas
          style={{
            alignSelf: "center",
            width: 320,
            height: 180,
            borderColor: "#aaaaaa",
            borderWidth: 1,
            borderStyle: "solid",
            marginVertical: PAD,
          }}
        >
          <Image
            image={example2}
            x={0}
            y={0}
            width={320}
            height={180}
            fit="contain"
          />
        </Canvas>
      </Pressable>
    </ScrollView>
  );
};
