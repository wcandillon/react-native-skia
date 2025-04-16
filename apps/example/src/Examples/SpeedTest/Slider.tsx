import { StyleSheet, View, useWindowDimensions } from "react-native";
import React from "react";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

interface Props {
  onValueChange: (value: number) => void;
  minValue: number;
  maxValue: number;
}

const size = 32;

const clamp = (value: number, lowerBound: number, upperBound: number) => {
  "worklet";
  return Math.min(Math.max(value, lowerBound), upperBound);
};

export const Slider: React.FC<Props> = ({
  onValueChange,
  minValue,
  maxValue,
}) => {
  const { width } = useWindowDimensions();

  const sliderWidth = width / 2;
  const pickerR = size / 2;
  const progressBarHeight = 3;

  const translateX = useSharedValue(-pickerR);
  const contextX = useSharedValue(0);
  const scale = useSharedValue(1);

  const styles = StyleSheet.create({
    picker: {
      position: "absolute",
      width: size,
      height: size,
      borderRadius: pickerR,
      backgroundColor: "white",
    },
    progressBar: {
      height: progressBarHeight,
      backgroundColor: "rgba(255,255,255,0.5)",
      width: sliderWidth,
    },
  });

  useAnimatedReaction(
    () => translateX.value,
    (value) => {
      const progress = interpolate(
        value,
        [-pickerR, sliderWidth - pickerR],
        [minValue, maxValue]
      );

      runOnJS(onValueChange)(progress);
    }
  );

  const rPickerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: -pickerR + progressBarHeight },
        { scale: scale.value },
      ],
    };
  }, []);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withTiming(1.2);
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      clamp;
      translateX.value = clamp(
        contextX.value + event.translationX,
        -pickerR,
        sliderWidth - pickerR
      );
    })
    .onFinalize(() => {
      scale.value = withTiming(1);
    });

  return (
    <View>
      <Animated.View style={styles.progressBar} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.picker, rPickerStyle]} />
      </GestureDetector>
    </View>
  );
};
