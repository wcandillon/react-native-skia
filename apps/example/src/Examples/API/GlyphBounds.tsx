import React, { useEffect, useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type {
  Glyph,
  SkFont,
  SkPoint,
  SkRect,
} from "@shopify/react-native-skia";
import {
  Canvas,
  Glyphs,
  Group,
  Path,
  RoundedRect,
  Skia,
  useFonts,
  vec,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const PADDING = 32;
const PALETTE = ["#e4667e", "#f5a623", "#61bea2", "#5b8def"];
// Timeline: center-out reveal, stroke hands over to the fill, short hold,
// then every glyph drops off the canvas under gravity.
const REVEAL_END = 0.45;
const FILL_END = 0.6;
const DROP_START = 0.72;

// Deterministic pseudo-random in [0, 1) so each glyph falls its own way.
const shuffle = (index: number) => {
  "worklet";
  const x = Math.sin((index + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

interface GlyphItem {
  // Tight ink bounds of the glyph, in paragraph coordinates.
  rect: SkRect;
  // Glyph id and baseline position for the Glyphs component.
  glyph: Glyph;
  // The resolved font of the run (the fallback font, if any).
  font: SkFont;
  center: SkPoint;
}

interface FallingGlyphProps {
  item: GlyphItem;
  index: number;
  count: number;
  dropHeight: number;
  progress: SharedValue<number>;
}

const FallingGlyph = ({
  item,
  index,
  count,
  dropHeight,
  progress,
}: FallingGlyphProps) => {
  // The box pops in when the center-out path reveal reaches its glyph. The
  // reveal overshoots slightly so the outermost boxes still reach full
  // opacity by the end of the sweep.
  const boxOpacity = useDerivedValue(() => {
    const reveal = Math.min(1, progress.value / REVEAL_END) * 1.2;
    const middle = (count - 1) / 2;
    const distance = Math.abs(index - middle) / Math.max(1, middle);
    return Math.min(1, Math.max(0, (reveal - distance) * 6));
  });
  const glyphOpacity = useDerivedValue(() =>
    Math.min(
      1,
      Math.max(0, (progress.value - REVEAL_END) / (FILL_END - REVEAL_END))
    )
  );
  const transform = useDerivedValue(() => {
    const drop = Math.max(0, (progress.value - DROP_START) / (1 - DROP_START));
    const rnd = shuffle(index);
    // Staggered release, then a free fall with a little drift and spin.
    const t = Math.max(0, drop - rnd * 0.3) / 0.7;
    return [
      { translateX: (rnd - 0.5) * 120 * t },
      { translateY: dropHeight * 1.3 * t * t },
      { rotate: (rnd - 0.5) * 3 * t },
    ];
  });
  return (
    <Group origin={item.center} transform={transform}>
      <RoundedRect
        x={item.rect.x}
        y={item.rect.y}
        width={item.rect.width}
        height={item.rect.height}
        r={3}
        color={PALETTE[index % PALETTE.length]}
        opacity={boxOpacity}
      />
      <Glyphs
        font={item.font}
        x={0}
        y={0}
        glyphs={[item.glyph]}
        color="#1e1e24"
        opacity={glyphOpacity}
      />
    </Group>
  );
};

const GlyphBoundsDemo = () => {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, [progress]);

  const customFontMgr = useFonts({
    "Roboto": [
      require("../../Tests/assets/Roboto-Medium.ttf"),
      require("../../Tests/assets/Roboto-Regular.ttf"),
    ],
    "Noto Sans SC": [require("../../Tests/assets/NotoSansSC-Regular.otf")],
  });

  const layoutWidth = width - PADDING * 2;
  const layout = useMemo(() => {
    if (customFontMgr === null) {
      return null;
    }
    const builder = Skia.ParagraphBuilder.Make({}, customFontMgr);
    builder.pushStyle({
      fontFamilies: ["Roboto", "Noto Sans SC"],
      fontSize: 32,
      color: Skia.Color("#1e1e24"),
    });
    builder.addText(
      "Skia knows the exact ink bounds of every glyph, even 你好 shaped via font fallback"
    );
    const paragraph = builder.build();
    paragraph.layout(layoutWidth);
    // extendedVisit() exposes the exact glyph layout that gets painted: the
    // resolved font, glyph ids, positions and per-glyph tight ink bounds.
    // Keeping each glyph separate lets us animate them individually.
    const items: GlyphItem[] = [];
    paragraph.extendedVisit((_lineNumber, info) => {
      if (info === null) {
        // end of line
        return;
      }
      for (let i = 0; i < info.glyphs.length; i++) {
        const bounds = info.bounds[i];
        if (bounds.width === 0 || bounds.height === 0) {
          // whitespace has no ink
          continue;
        }
        // positions are relative to the run origin, bounds to the glyph
        // origin: adding all three yields paragraph coordinates.
        const x = info.origin.x + info.positions[i].x;
        const y = info.origin.y + info.positions[i].y;
        const rect = Skia.XYWHRect(
          x + bounds.x,
          y + bounds.y,
          bounds.width,
          bounds.height
        );
        items.push({
          rect,
          glyph: { id: info.glyphs[i], pos: vec(x, y) },
          font: info.font,
          center: vec(rect.x + rect.width / 2, rect.y + rect.height / 2),
        });
      }
    });
    // getPath() turns the same laid out glyphs into an SkPath used for the
    // trim reveal below.
    const path = Skia.Path.Make();
    paragraph.getLineMetrics().forEach(({ lineNumber }) => {
      const line = paragraph.getPath(lineNumber);
      if (line) {
        path.addPath(line);
      }
    });
    return { path, items, height: paragraph.getHeight() };
  }, [customFontMgr, layoutWidth]);

  // The stroke reveals the text from the center of the path outwards, going
  // from trim (0.5, 0.5) to (0, 1), then hands over to the fill.
  const start = useDerivedValue(
    () => 0.5 * (1 - Math.min(1, progress.value / REVEAL_END))
  );
  const end = useDerivedValue(
    () => 0.5 * (1 + Math.min(1, progress.value / REVEAL_END))
  );
  const strokeOpacity = useDerivedValue(
    () =>
      1 -
      Math.min(
        1,
        Math.max(0, (progress.value - REVEAL_END) / (FILL_END - REVEAL_END))
      )
  );

  if (layout === null) {
    return null;
  }
  return (
    <Canvas style={{ width, height }}>
      <Group transform={[{ translateX: PADDING }, { translateY: PADDING }]}>
        {layout.items.map((item, index) => (
          <FallingGlyph
            key={index}
            item={item}
            index={index}
            count={layout.items.length}
            dropHeight={height}
            progress={progress}
          />
        ))}
        <Path
          path={layout.path}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
          color="#1e1e24"
          opacity={strokeOpacity}
          start={start}
          end={end}
        />
      </Group>
    </Canvas>
  );
};

export const GlyphBounds = () => {
  if (Platform.OS === "web") {
    return (
      <View style={styles.fallback}>
        <Text>
          Paragraph.extendedVisit() is not implemented on React Native Web.
        </Text>
      </View>
    );
  }
  return <GlyphBoundsDemo />;
};

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: PADDING,
  },
});
