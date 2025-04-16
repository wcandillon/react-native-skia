import React, { useCallback, useMemo } from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  clamp,
} from "@shopify/react-native-skia";

import { snapPoint } from "./Math";
import {
  transition,
  cube,
  pageCurl,
  glitchMemories,
  swirl,
  swap,
} from "./transitions/index";
import { useAssets } from "./Assets";

const { width, height } = Dimensions.get("window");
const transitions = [
  cube,
  pageCurl,
  cube,
  glitchMemories,
  swirl,
  swap,
  cube,
].map((t) => transition(t));

/*
 // Example usage:
const arr = [1, 2, 3, 4, 5];
console.log(getElementAtIndex(arr, 7)); // Output: 3
console.log(getElementAtIndex(arr, -2)); // Output: 4
*/
const at = <T,>(array: T[] | null, index: number): T | null => {
  "worklet";
  if (array === null) {
    return null;
  }
  return array[((index % array.length) + array.length) % array.length];
};

const duration = 100;

export const Transitions = () => {
  const offset = useSharedValue(0);
  const progressLeft = useSharedValue(0);
  const progressRight = useSharedValue(0);
  const assets = useAssets();
  const next = useCallback(() => {
    offset.value += 1;
    progressLeft.value = 0;
  }, [offset, progressLeft]);
  const previous = useCallback(() => {
    offset.value -= 1;
    progressRight.value = 0;
  }, [offset, progressRight]);
  const panRight = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          progressRight.value = 0;
        })
        .activeOffsetX(10)
        .onChange((pos) => {
          progressRight.value = clamp(
            progressRight.value + pos.changeX / width,
            0,
            1
          );
        })
        .onEnd(({ velocityX }) => {
          const dst = snapPoint(progressRight.value, velocityX / width, [0, 1]);
          progressRight.value = withTiming(dst, { duration }, () => {
            runOnJS(previous)();
          });
        }),
    [previous, progressRight]
  );
  const panLeft = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-10)
        .onChange((pos) => {
          progressLeft.value = clamp(
            progressLeft.value - pos.changeX / width,
            0,
            1
          );
        })
        .onEnd(({ velocityX }) => {
          const dst = snapPoint(progressLeft.value, -velocityX / width, [0, 1]);
          progressLeft.value = withTiming(dst, { duration }, () => {
            runOnJS(next)();
          });
        }),
    [next, progressLeft]
  );

  const uniformsRight = useDerivedValue(() => {
    return {
      progress: progressRight.value,
      resolution: [width, height],
    };
  });

  const uniformsLeft = useDerivedValue(() => {
    return {
      progress: progressLeft.value,
      resolution: [width, height],
    };
  });
  const transition1 = useDerivedValue(() => {
    return at(transitions, offset.value - 1)!;
  });

  const transition2 = useDerivedValue(() => {
    return at(transitions, offset.value)!;
  });

  const assets1 = useDerivedValue(() => {
    return at(assets, offset.value - 1);
  });

  const assets2 = useDerivedValue(() => {
    return at(assets, offset.value);
  });

  const assets3 = useDerivedValue(() => {
    return at(assets, offset.value + 1);
  });

  if (!assets) {
    return null;
  }
  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={Gesture.Race(panRight, panLeft)}>
        <Canvas style={{ flex: 1 }}>
          <Fill>
            <Shader source={transition1} uniforms={uniformsRight}>
              <Shader source={transition2} uniforms={uniformsLeft}>
                <ImageShader
                  image={assets2}
                  fit="cover"
                  width={width}
                  height={height}
                />
                <ImageShader
                  image={assets3}
                  fit="cover"
                  width={width}
                  height={height}
                />
              </Shader>
              <ImageShader
                image={assets1}
                fit="cover"
                width={width}
                height={height}
              />
            </Shader>
          </Fill>
        </Canvas>
      </GestureDetector>
    </View>
  );
};
