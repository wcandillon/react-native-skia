import React from "react";
import { useWindowDimensions } from "react-native";
import {
  Fill,
  Group,
  interpolate,
  SweepGradient,
  Turbulence,
  useSharedValueEffect,
  useValue,
  vec,
  useComputedValue,
  rrect,
  rect,
} from "@shopify/react-native-skia";
import { SensorType, useAnimatedSensor } from "react-native-reanimated";

const schemes = {
  metalic: ["#e4e9f1", "#6F7D95", "#ffffff", "#B2C1D6", "#ffffff", "#B2C1D6"],
  pastel: ["#BFB2F3", "#96CAF7", "#9CDCAA", "#E5E1AB", "#F3C6A5", "#F8A3A8"],
  barbie: ["#6BB6B1", "#F8D8BB", "#FFAFC1", "#F4ED85", "#B1A7D1", "#6BB6B1"],
};

const delta = 1 / (schemes.metalic.length - 1);

interface CardProps {
  scheme: keyof typeof schemes;
}

export const Card = ({ scheme }: CardProps) => {
  const { width, height } = useWindowDimensions();
  const CARD_WIDTH = width - 64;
  const CARD_HEIGHT = CARD_WIDTH * 0.61;
  const colors = schemes[scheme];
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, {
    interval: 10,
  });

  const c = vec(width / 2, height / 2);
  const offsetX = useValue(c.x);
  const offsetY = useValue(c.y);
  const x = useValue(offsetX.current);
  const y = useValue(offsetY.current);

  useSharedValueEffect(() => {
    x.current = interpolate(
      animatedSensor.sensor.value.pitch,
      [-Math.PI, Math.PI],
      [-width, width * 2]
    );
    y.current = interpolate(
      animatedSensor.sensor.value.yaw,
      [-Math.PI, Math.PI],
      [-height, height * 2]
    );
  }, animatedSensor.sensor);
  const positions = useComputedValue(
    () => [
      0,
      interpolate(x.current, [0, width], [0, delta]),
      interpolate(y.current, [0, height], [delta, 3 * delta]),
      interpolate(x.current, [0, width], [3 * delta, 4 * delta]),
      interpolate(y.current, [0, height], [4 * delta, 1]),
      1,
    ],
    [x, y]
  );
  return (
    <Group
      clip={rrect(
        rect(
          c.x - CARD_WIDTH / 2,
          c.y - CARD_HEIGHT / 2,
          CARD_WIDTH,
          CARD_HEIGHT
        ),
        25,
        25
      )}
    >
      <Fill>
        <SweepGradient c={c} colors={colors} positions={positions} />
      </Fill>
      <Fill blendMode="softLight">
        <Turbulence freqX={0.4} freqY={0.4} octaves={3} />
      </Fill>
    </Group>
  );
};

Card.defaultProps = {
  scheme: "metalic",
};
