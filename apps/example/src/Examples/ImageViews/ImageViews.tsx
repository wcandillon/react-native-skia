import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { SkImage } from "react-native-skia";
import { Canvas, Image, SkiaImageView, useImage } from "react-native-skia";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useGpuImage } from "../Graphite/Graphite";

// One image in cells that mount on a timer, beside a square the UI thread turns.

type Presenter = "Canvas" | "Static canvas" | "SkiaImageView";
type Source = "GPU drawing" | "Decoded photo";

const presenters: Presenter[] = ["Canvas", "Static canvas", "SkiaImageView"];
const sources: Source[] = ["GPU drawing", "Decoded photo"];

const COUNT = 120;
const SIZE = 40;
const TOGGLE_INTERVAL = 800;

const oslo = require("../../assets/oslo.jpg");

const Spinner = () => {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1
    );
  }, [rotation]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return <Animated.View style={[styles.spinner, style]} />;
};

const Cell = ({
  image,
  presenter,
}: {
  image: SkImage;
  presenter: Presenter;
}) => {
  switch (presenter) {
    case "SkiaImageView":
      return <SkiaImageView image={image} style={styles.cell} />;
    case "Canvas":
    case "Static canvas":
      return (
        <Canvas style={styles.cell} static={presenter === "Static canvas"}>
          <Image
            image={image}
            x={0}
            y={0}
            width={SIZE}
            height={SIZE}
            fit="fill"
          />
        </Canvas>
      );
  }
};

const Chips = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (option: T) => void;
}) => (
  <View style={styles.row}>
    {options.map((option) => (
      <Pressable
        key={option}
        onPress={() => onChange(option)}
        style={[styles.chip, option === value && styles.chipActive]}
      >
        <Text
          style={[styles.chipText, option === value && styles.chipTextActive]}
        >
          {option}
        </Text>
      </Pressable>
    ))}
  </View>
);

export const ImageViews = () => {
  const [presenter, setPresenter] = useState<Presenter>("SkiaImageView");
  const [source, setSource] = useState<Source>("GPU drawing");
  const [churn, setChurn] = useState(true);
  const [phase, setPhase] = useState(true);
  const drawing = useGpuImage();
  const photo = useImage(oslo);
  useEffect(() => {
    if (!churn) {
      return undefined;
    }
    const interval = setInterval(
      () => setPhase((value) => !value),
      TOGGLE_INTERVAL
    );
    return () => clearInterval(interval);
  }, [churn]);
  const image = source === "GPU drawing" ? drawing : photo;
  const mounted = !churn || phase;
  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Chips options={presenters} value={presenter} onChange={setPresenter} />
        <Chips options={sources} value={source} onChange={setSource} />
        <View style={styles.row}>
          <Text style={styles.label}>
            {`mount and unmount every ${TOGGLE_INTERVAL} ms`}
          </Text>
          <Switch value={churn} onValueChange={setChurn} testID="churn" />
          <Spinner />
        </View>
        <Text style={styles.hint}>
          Each canvas makes its own native view and GPU surface when it mounts.
          A static canvas draws its frame into an image instead, off the main
          thread. The image views of one image share one bitmap, read back from
          the image once, and mount like plain views.
        </Text>
      </View>
      <View style={styles.grid} testID="grid">
        {mounted && image !== null
          ? Array.from({ length: COUNT }).map((_, i) => (
              // A canvas reads `static` once, when its native view is made:
              // another presenter mounts new cells.
              <Cell
                key={`${presenter}-${i}`}
                image={image}
                presenter={presenter}
              />
            ))
          : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontWeight: "bold",
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#999",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "#007aff",
    borderColor: "#007aff",
  },
  chipText: {
    color: "#333",
  },
  chipTextActive: {
    color: "white",
  },
  hint: {
    color: "#666",
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#ff3b30",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 4,
  },
  cell: {
    width: SIZE,
    height: SIZE,
  },
});
