import { Circle, vec, Line } from "@shopify/react-native-skia";
import React from "react";

import { FG } from "./Theme";

const R = 50;

export const Hamburger = () => {
  return (
    <>
      <Circle r={R} color={FG} />
      <Line
        p1={vec(-20, -15)}
        p2={vec(20, -15)}
        color="white"
        style="stroke"
        strokeWidth={6}
      />
      <Line
        p1={vec(-20, 0)}
        p2={vec(20, 0)}
        color="white"
        style="stroke"
        strokeWidth={6}
      />
      <Line
        p1={vec(-20, 15)}
        p2={vec(20, 15)}
        color="white"
        style="stroke"
        strokeWidth={6}
      />
    </>
  );
};
