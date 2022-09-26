import React from "react";
import {
  Circle,
  Group,
  Line,
  Oval,
  Path,
  rect,
  vec,
  RoundedRect,
  rrect,
  Points,
} from "@shopify/react-native-skia";
import type { ReactNode } from "react";

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

export const Camera = () => (
  <Icon>
    <Path path="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle c={vec(12, 13)} r={4} />
  </Icon>
);

export const Menu = () => (
  <Icon>
    <Line p1={vec(3, 12)} p2={vec(21, 12)} />
    <Line p1={vec(3, 6)} p2={vec(21, 6)} />
    <Line p1={vec(3, 18)} p2={vec(21, 18)} />
  </Icon>
);

export const Plus = () => (
  <Icon>
    <Line p1={vec(12, 5)} p2={vec(12, 19)} />
    <Line p1={vec(5, 12)} p2={vec(19, 12)} />
  </Icon>
);

export const Database = () => (
  <Icon>
    <Oval rect={rect(3, 2, 18, 6)} />
    <Path path="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <Path path="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </Icon>
);

export const Calendar = () => (
  <Icon>
    <RoundedRect rect={rrect(rect(3, 4, 18, 18), 2, 2)} />
    <Line p1={vec(16, 2)} p2={vec(16, 6)} />
    <Line p1={vec(8, 2)} p2={vec(8, 6)} />
    <Line p1={vec(3, 10)} p2={vec(21, 10)} />
  </Icon>
);

export const Clock = () => (
  <Icon>
    <Circle c={vec(12, 12)} r={10} />
    <Points points={[vec(12, 6), vec(12, 12), vec(16, 14)]} mode="polygon" />
  </Icon>
);

export const Trash = () => (
  <Icon>
    <Points points={[vec(3, 6), vec(5, 6), vec(21, 6)]} mode="polygon" />
    <Path path="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <Line p1={vec(10, 11)} p2={vec(10, 17)} />
    <Line p1={vec(14, 11)} p2={vec(14, 17)} />
  </Icon>
);
