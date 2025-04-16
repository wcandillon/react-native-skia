import React, { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, useWindowDimensions } from "react-native";
import type { DataModule } from "@shopify/react-native-skia";
import {
  Canvas,
  Group,
  PaintStyle,
  Paragraph,
  Rect,
  Skia,
  mix,
  useFonts,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const fonts: Record<string, DataModule[]> = {
  Roboto: [
    require("../../Tests/assets/Roboto-Medium.ttf"),
    require("../../Tests/assets/Roboto-Regular.ttf"),
  ],
};
// On Web, we need provide a font for emojis
if (Platform.OS === "web") {
  fonts.NotoColorEmoji = [require("../../Tests/assets/NotoColorEmoji.ttf")];
}
export const Paragraphs2 = () => {
  const { height, width } = useWindowDimensions();
  const progress = useSharedValue(1);
  const [key, setKey] = useState(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(0, { duration: 3000 }), -1, true);
  }, [progress]);

  const loopedWidth = useDerivedValue(
    () => mix(progress.value, width * 0.2, width * 0.8),
    [progress]
  );

  const customFontMgr = useFonts(fonts);

  // Create and store paragraph builder separately
  const paragraphBuilder = useMemo(() => {
    if (customFontMgr === null) {
      return null;
    }
    return Skia.ParagraphBuilder.Make({}, customFontMgr);
  }, [customFontMgr]);

  // Force recreation of paragraphBuilder periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (paragraphBuilder) {
        // Force paragraph builder to reset and create new paragraph
        paragraphBuilder.reset();
        setKey((prev) => prev + 1);
      }
    }, 100); // Rapid recreation

    return () => clearInterval(interval);
  }, [paragraphBuilder]);

  const paragraph = useMemo(() => {
    if (!paragraphBuilder) {
      return null;
    }

    paragraphBuilder.reset();
    const fontSize = 20;
    const strokePaint = Skia.Paint();
    strokePaint.setStyle(PaintStyle.Stroke);
    strokePaint.setStrokeWidth(1);

    const textStyle = {
      fontSize,
      fontFamilies: ["Roboto", "NotoColorEmoji"],
      color: Skia.Color("#000"),
    };

    // Simplified paragraph content for testing
    paragraphBuilder
      .pushStyle(textStyle)
      .addText("Test Text " + key) // Add key to force rememo
      .pop()
      .build();

    const built = paragraphBuilder.build();

    // Try to force garbage collection of previous paragraph
    paragraphBuilder.reset();

    return built;
  }, [paragraphBuilder, key]); // Depend on key to force recreation

  return (
    <ScrollView>
      <Canvas
        style={{
          width,
          height,
        }}
      >
        <Group transform={[{ translateX: 30 }, { translateY: 30 }]}>
          <Paragraph paragraph={paragraph} x={0} y={0} width={loopedWidth} />
          <Rect x={loopedWidth} y={0} width={1} height={300} />
        </Group>
      </Canvas>
    </ScrollView>
  );
};
