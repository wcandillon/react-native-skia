import React from "react";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

// Feather-style line icons drawn inline so we don't pull in a vector-icons
// font dependency. Stroked paths look correct on both themes when `color`
// is wired to the current foreground.
export type IconName = "menu" | "moon" | "sun" | "check";

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export const Icon = ({
  name,
  size = 24,
  color,
  strokeWidth = 2,
}: IconProps) => {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
  };
  switch (name) {
    case "menu":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="3" y1="6" x2="21" y2="6" {...stroke} />
          <Line x1="3" y1="12" x2="21" y2="12" {...stroke} />
          <Line x1="3" y1="18" x2="21" y2="18" {...stroke} />
        </Svg>
      );
    case "moon":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            {...stroke}
          />
        </Svg>
      );
    case "sun":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="4" {...stroke} />
          <Line x1="12" y1="1" x2="12" y2="3" {...stroke} />
          <Line x1="12" y1="21" x2="12" y2="23" {...stroke} />
          <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" {...stroke} />
          <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" {...stroke} />
          <Line x1="1" y1="12" x2="3" y2="12" {...stroke} />
          <Line x1="21" y1="12" x2="23" y2="12" {...stroke} />
          <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" {...stroke} />
          <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" {...stroke} />
        </Svg>
      );
    case "check":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="20 6 9 17 4 12" {...stroke} />
        </Svg>
      );
  }
};
