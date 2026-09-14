import React, { useEffect, useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Canvas,
  FontWeight,
  Group,
  LinearGradient,
  Path,
  Skia,
  TextAlign,
  useFonts,
  vec,
} from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const PADDING = 32;
const PALETTE = ["#e4667e", "#f5a623", "#61bea2", "#5b8def"];

const ParagraphPathDemo = () => {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, [progress]);

  const customFontMgr = useFonts({
    Roboto: [
      require("../../Tests/assets/Roboto-Medium.ttf"),
      require("../../Tests/assets/Roboto-Regular.ttf"),
    ],
  });

  const contentWidth = width - PADDING * 2;
  const layout = useMemo(() => {
    if (customFontMgr === null) {
      return null;
    }
    // The paragraph style is baked into the path: the centered line breaks
    // below come from the paragraph layout, not from manual positioning.
    const builder = Skia.ParagraphBuilder.Make(
      { textAlign: TextAlign.Center },
      customFontMgr
    );
    builder.pushStyle({
      fontFamilies: ["Roboto"],
      fontSize: 48,
      fontStyle: { weight: FontWeight.Bold },
      color: Skia.Color("black"),
    });
    builder.addText("Can it be done in React Native?");
    const paragraph = builder.build();
    paragraph.layout(contentWidth);
    // getPath() converts the glyphs of a laid out line into an SkPath, with
    // all font fallbacks already applied. Merge the lines into a single path.
    const path = Skia.Path.Make();
    paragraph.getLineMetrics().forEach(({ lineNumber }) => {
      const line = paragraph.getPath(lineNumber);
      if (line) {
        path.addPath(line);
      }
    });
    return { path, height: paragraph.getHeight() };
  }, [customFontMgr, contentWidth]);

  // The stroke reveals the text from the center of the path outwards, going
  // from trim (0.5, 0.5) to (0, 1); the fill fades in once it completes.
  const start = useDerivedValue(
    () => 0.5 * (1 - Math.min(1, progress.value / 0.7))
  );
  const end = useDerivedValue(
    () => 0.5 * (1 + Math.min(1, progress.value / 0.7))
  );
  const fillOpacity = useDerivedValue(() =>
    Math.max(0, (progress.value - 0.7) / 0.3)
  );
  // The stroke hands over to the fill: at the end only the fill remains.
  const strokeOpacity = useDerivedValue(() => 1 - fillOpacity.value);

  if (layout === null) {
    return null;
  }
  return (
    <ScrollView>
      <Canvas style={{ width, height: layout.height + PADDING * 2 }}>
        <Group transform={[{ translateX: PADDING }, { translateY: PADDING }]}>
          <Path path={layout.path} opacity={fillOpacity}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(contentWidth, layout.height)}
              colors={PALETTE}
            />
          </Path>
          <Path
            path={layout.path}
            style="stroke"
            strokeWidth={2.5}
            strokeCap="round"
            strokeJoin="round"
            opacity={strokeOpacity}
            start={start}
            end={end}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(contentWidth, layout.height)}
              colors={PALETTE}
            />
          </Path>
        </Group>
      </Canvas>
    </ScrollView>
  );
};

export const ParagraphPath = () => {
  if (Platform.OS === "web") {
    return (
      <View style={styles.fallback}>
        <Text>Paragraph.getPath() is not implemented on React Native Web.</Text>
      </View>
    );
  }
  return <ParagraphPathDemo />;
};

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: PADDING,
  },
});
