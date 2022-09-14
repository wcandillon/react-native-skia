import {
  Canvas,
  Rect,
  Skia,
  SkiaView,
  PaintStyle,
  Group,
  useTouchHandler,
  useValue,
  useComputedValue,
  Selector,
} from "@shopify/react-native-skia";
import type { SkCanvas, DrawingInfo } from "@shopify/react-native-skia";
import React, { useMemo, useCallback, useState, useRef } from "react";
import {
  Switch,
  StyleSheet,
  useWindowDimensions,
  View,
  Text,
  Button,
} from "react-native";

const Size = 25;
const Increaser = 50;

export const PerformanceDrawingTest: React.FC = () => {
  const [isDeclarative, setIsDeclarative] = useState(true);
  const [numberOfBoxes, setNumberOfBoxes] = useState(150);

  const { width, height } = useWindowDimensions();

  const SizeWidth = Size;
  const SizeHeight = Size * 0.45;

  const paint1 = useMemo(() => {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color("#00ff00"));
    return p;
  }, []);

  const paint2 = useMemo(() => {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color("#4060A3"));
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    return p;
  }, []);

  const currentTouch = useValue<{ x: number; y: number }>({
    x: width / 2,
    y: height * 0.25,
  });
  const onTouch = useTouchHandler({
    onActive: ({ x, y }) => {
      currentTouch.current = { x, y };
    },
  });

  const rects = useMemo(
    () =>
      new Array(numberOfBoxes)
        .fill(0)
        .map((_, i) =>
          Skia.XYWHRect(
            5 + ((i * Size) % width),
            25 + Math.floor(i / (width / Size)) * Size,
            SizeWidth,
            SizeHeight
          )
        ),
    [numberOfBoxes, width, SizeWidth, SizeHeight]
  );

  const rotationTransforms = useComputedValue(() => {
    return rects.map((rect) => {
      const p1 = { x: rect.x, y: rect.y };
      const p2 = currentTouch.current;
      const r = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      return [{ rotate: r }];
    });
  }, [currentTouch, rects]);

  const currentTouch2 = useRef({ x: width / 2, y: height * 0.25 });
  const draw = useCallback(
    (canvas: SkCanvas, info: DrawingInfo) => {
      for (let i = 0; i < rects.length; i++) {
        canvas.save();
        const t =
          info.touches.length > 0 && info.touches[0].length > 0
            ? info.touches[0][0]
            : undefined;

        if (t) {
          currentTouch2.current = { x: t.x, y: t.y };
        }

        var p1 = { x: rects[i].x, y: rects[i].y };
        var p2 = currentTouch2.current;
        var a = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
        canvas.rotate(
          a,
          rects[i].x - rects[i].width / 2,
          rects[i].y - rects[i].height / 2
        );

        canvas.drawRect(rects[i], paint1);
        canvas.drawRect(rects[i], paint2);
        canvas.restore();
      }
    },
    [paint1, paint2, rects]
  );

  return (
    <View style={styles.container}>
      <View style={styles.mode}>
        <View style={styles.panel}>
          <Button
            title="⬇️"
            onPress={() => setNumberOfBoxes((n) => Math.max(0, n - Increaser))}
          />
          <Text>&nbsp;Size&nbsp;</Text>
          <Text>{numberOfBoxes}</Text>
          <Text>&nbsp;</Text>
          <Button
            title="⬆️"
            onPress={() => setNumberOfBoxes((n) => n + Increaser)}
          />
        </View>
        <View style={styles.panel}>
          <Text>Use Declarative model&nbsp;</Text>
          <Switch
            value={isDeclarative}
            onValueChange={() => setIsDeclarative((p) => !p)}
          />
        </View>
      </View>
      {isDeclarative ? (
        <Canvas style={styles.container} debug mode="default" onTouch={onTouch}>
          {rects.map((_, i) => (
            <Group
              key={i}
              transform={Selector(rotationTransforms, (v) => v[i])}
              origin={rects[i]}
            >
              <Rect rect={rects[i]} color="#00ff00" />
              <Rect
                rect={rects[i]}
                color="#4060A3"
                style="stroke"
                strokeWidth={2}
              />
            </Group>
          ))}
        </Canvas>
      ) : (
        <SkiaView
          style={styles.container}
          onDraw={draw}
          mode="continuous"
          debug
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mode: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panel: {
    flexDirection: "row",
    alignItems: "center",
  },
});
