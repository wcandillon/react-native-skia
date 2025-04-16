import type { SkSize } from "@shopify/react-native-skia";
import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  mix,
  polar2Canvas,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useContextBridge } from "its-fine";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { useLoop } from "../../components/Animations";

const c1 = "#61bea2";
const c2 = "#529ca0";

interface SizeProps {
  size: SharedValue<SkSize>;
}

interface RingProps extends SizeProps {
  index: number;
  progress: SharedValue<number>;
}

const Ring = ({ index, progress, size }: RingProps) => {
  const R = useDerivedValue(() => size.value.width / 4);
  const center = useDerivedValue(() =>
    vec(size.value.width / 2, size.value.height / 2 - 64)
  );

  const theta = (index * (2 * Math.PI)) / 6;
  const transform = useDerivedValue(() => {
    const { x, y } = polar2Canvas(
      { theta, radius: progress.value * R.value },
      { x: 0, y: 0 }
    );
    const scale = mix(progress.value, 0.3, 1);
    return [{ translateX: x }, { translateY: y }, { scale }];
  }, [progress, R]);

  return (
    <Circle
      c={center}
      r={R}
      color={index % 2 ? c1 : c2}
      origin={center}
      transform={transform}
    />
  );
};

const BreatheDemo = ({ size }: SizeProps) => {
  const center = useDerivedValue(() =>
    vec(size.value.width / 2, size.value.height / 2 - 64)
  );

  const progress = useLoop({ duration: 3000 });

  const transform = useDerivedValue(
    () => [{ rotate: mix(progress.value, -Math.PI, 0) }],
    [progress]
  );

  return (
    <>
      <Fill color="rgb(36,43,56)" />
      <Group origin={center} transform={transform} blendMode="screen">
        <BlurMask style="solid" blur={40} />
        {new Array(6).fill(0).map((_, index) => {
          return (
            <Ring size={size} key={index} index={index} progress={progress} />
          );
        })}
      </Group>
    </>
  );
};

const MyComp = ({ size }: SizeProps) => {
  const navigation = useNavigation();
  const { routeNames } = navigation.getState()!;
  console.log({ routeNames });
  return (
    <Group>
      <BreatheDemo size={size} />
    </Group>
  );
};

export const UseCanvas = () => {
  const Bridge = useContextBridge();
  const size = useSharedValue({ width: 0, height: 0 });
  const height = useRef(new Animated.Value(0));
  useEffect(() => {
    Animated.loop(
      Animated.timing(height.current, {
        toValue: 500,
        duration: 4000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1 }} onSize={size}>
        <Bridge>
          <MyComp size={size} />
        </Bridge>
      </Canvas>
      <Animated.View style={{ height: height.current }} />
    </View>
  );
};
