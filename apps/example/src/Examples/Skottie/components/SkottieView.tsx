import React, { useEffect } from "react";
import {
  Canvas,
  Skia,
  Skottie,
  useClock,
  type SkSkottieAnimation,
} from "@shopify/react-native-skia";
import type { StyleProp, ViewStyle } from "react-native";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";

const isSkottieAnimation = (source: unknown): source is SkSkottieAnimation => {
  return (
    source !== null &&
    typeof source === "object" &&
    (source as Record<string, string>).__typename__ === "SkSkottieAnimation"
  );
};

export interface SkottieViewProps {
  source: string | SkSkottieAnimation | { uri: string };
  progress: SharedValue<number> | number;
  speed?: number;
  duration?: number;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "contain" | "center";
  autoPlay?: boolean;
}

export const SkottieView = ({
  source,
  progress,
  speed = 1,
  duration,
  loop = true,
  style,
  resizeMode = "contain",
  autoPlay = false,
}: SkottieViewProps) => {
  const clock = useClock();
  const [animation, setAnimation] = React.useState<SkSkottieAnimation | null>(
    null
  );
  useEffect(() => {
    if (typeof source === "string") {
      setAnimation(Skia.Skottie.Make(JSON.stringify(source)));
    } else if (isSkottieAnimation(source)) {
      setAnimation(source);
    }
  }, [source]);
  const frame = useDerivedValue(() => {
    if (!animation) {
      return 0;
    }
    const fps = animation.fps();
    const dur = animation.duration();
    const currentFrame = Math.floor((clock.value / 1000) * fps) % (dur * fps);
    return currentFrame;
  });
  return (
    <Canvas style={style}>
      {animation && <Skottie animation={animation} frame={frame} />}
    </Canvas>
  );
};
