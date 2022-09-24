import React from "react";
import { Circle, Group, Line, Path, vec } from "@shopify/react-native-skia";
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
