/* eslint-disable max-len */
import type { Vector } from "@shopify/react-native-skia";
import {
  Skia,
  Circle,
  Group,
  Line,
  Path,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import type { ReactNode } from "react";
import React, { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OverlayProps {}

export const Overlay = () => {
  const insets = useSafeAreaInsets();
  const titleFont = useFont(require("./assets/Roboto-Bold.ttf"), 32);
  const normalFont = useFont(require("./assets/Roboto-Bold.ttf"), 16);
  if (!titleFont || !normalFont) {
    return null;
  }
  return (
    <>
      <Group />
      <Group transform={[{ translateY: insets.top }]}>
        <Info />
      </Group>
      <Group transform={[{ translateY: 150 }]}>
        <Close />
      </Group>
      <Group transform={[{ translateY: 200 }]}>
        <Settings />
      </Group>
      <Group transform={[{ translateY: 250 }]}>
        <AirPlay />
      </Group>
    </>
  );
};

interface PolygonProps {
  polygon: Vector[];
}

const Polygon = ({ polygon }: PolygonProps) => {
  const path = useMemo(
    () =>
      polygon.reduce((current, point) => {
        if (current.isEmpty()) {
          current.moveTo(point.x, point.y);
        } else {
          current.lineTo(point.x, point.y);
        }
        return current;
      }, Skia.Path.Make()),
    [polygon]
  );
  return <Path path={path} />;
};

interface IconProps {
  children: ReactNode | ReactNode[];
}

const Icon = ({ children }: IconProps) => (
  <Group
    style="stroke"
    strokeWidth={2}
    strokeCap="round"
    strokeJoin="round"
    color="white"
  >
    {children}
  </Group>
);

const Info = () => (
  <Icon>
    <Circle c={vec(12, 12)} r={10} />
    <Line p1={vec(12, 16)} p2={vec(12, 12)} />
    <Line p1={vec(12, 8)} p2={vec(12, 8)} />
  </Icon>
);

const Close = () => (
  <Icon>
    <Line p1={vec(18, 6)} p2={vec(6, 18)} />
    <Line p1={vec(6, 6)} p2={vec(18, 18)} />
  </Icon>
);

const Settings = () => (
  <Icon>
    <Circle c={vec(12, 12)} r={3} />
    <Path path="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);

const AirPlay = () => (
  <Icon>
    <Path path="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
    <Polygon polygon={[vec(12, 15), vec(17, 21), vec(7, 21), vec(12, 15)]} />
  </Icon>
);
