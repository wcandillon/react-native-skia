import {
  Canvas,
  Skia,
  processTransform3d,
  useImage,
  Image,
  BackdropFilter,
  Fill,
  usePathValue,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useSharedValue,
  withSpring,
  useDerivedValue,
} from "react-native-reanimated";

import { BlurMask } from "./BlurGradient";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = CARD_WIDTH / 1.618;
const rct = Skia.XYWHRect(
  (width - CARD_WIDTH) / 2,
  (height - CARD_HEIGHT) / 2,
  CARD_WIDTH,
  CARD_HEIGHT
);
const rrct = Skia.RRectXY(rct, 10, 10);
const roundedRectPath = Skia.Path.Make();
roundedRectPath.addRRect(rrct);

const sf = 300;
const springConfig = (velocity: number) => {
  "worklet";
  return {
    mass: 1,
    damping: 1,
    stiffness: 100,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
    velocity,
  };
};

export const FrostedCard = () => {
  const image = useImage(require("./dynamo.jpg"));
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onChange((event) => {
      rotateY.value += event.changeX / sf;
      rotateX.value -= event.changeY / sf;
    })
    .onEnd(({ velocityX, velocityY }) => {
      rotateX.value = withSpring(0, springConfig(velocityY / sf));
      rotateY.value = withSpring(0, springConfig(velocityX / sf));
    });

  const matrix = useDerivedValue(() => {
    return processTransform3d([
      { translate: [width / 2, height / 2] },
      { perspective: 300 },
      { rotateX: rotateX.value },
      { rotateY: rotateY.value },
      { translate: [-width / 2, -height / 2] },
    ]);
  });

  const clip = usePathValue((path) => {
    "worklet";
    path.transform(matrix.value);
  }, roundedRectPath);

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ flex: 1 }}>
          <Image
            image={image}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
          <BackdropFilter filter={<BlurMask matrix={matrix} />} clip={clip}>
            <Fill color="rgba(255, 255, 255, 0.1)" />
          </BackdropFilter>
        </Canvas>
      </GestureDetector>
    </View>
  );
};
