import type { SkFont } from "@shopify/react-native-skia";
import { Group, Text } from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

import { Calendar, Clock, Database } from "./Icons";

const { width } = Dimensions.get("window");

interface LabelsProps {
  font: SkFont;
  size: string;
  duration: string;
}

const updated = "Just now";

export const Labels = ({ font, size, duration }: LabelsProps) => {
  const s1 = (width - (30 + font.getTextWidth(updated))) / 2;
  const s3 = width - 16 - (30 + font.getTextWidth(duration));
  return (
    <Group transform={[{ translateY: 124 }, { scale: 0.9 }]}>
      <Group transform={[{ translateX: 16 }]}>
        <Database />
        <Text x={30} y={18} text={size} color="white" font={font} />
      </Group>
      <Group transform={[{ translateX: s1 }]}>
        <Calendar />
        <Text x={30} y={18} text={updated} color="white" font={font} />
      </Group>
      <Group transform={[{ translateX: s3 }]}>
        <Clock />
        <Text x={30} y={18} text={duration} color="white" font={font} />
      </Group>
    </Group>
  );
};
