import {
  Canvas,
  Paint,
  Rect,
  Skia,
  SkiaView,
  usePaint,
  PaintStyle,
  usePaintRef,
} from "@shopify/react-native-skia";
import type { SkCanvas } from "@shopify/react-native-skia";
import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import {
  Switch,
  StyleSheet,
  useWindowDimensions,
  View,
  Text,
  Button,
} from "react-native";

const Size = 5;

export const PerformanceDrawingTest: React.FC = () => {
  const [isDeclarative, setIsDeclarative] = useState(false);
  const [numberOfBoxes, setNumberOfBoxes] = useState(1000);

  const { width } = useWindowDimensions();
  const paint1 = usePaint((p) => {
    p.setAntiAlias(true);
    p.setColor(Skia.Color("#A2AE6A"));
  });
  const paint2 = usePaint((p) => {
    p.setAntiAlias(true);
    p.setColor(Skia.Color("#4060A3"));
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
  });
  const rects = useMemo(
    () =>
      new Array(numberOfBoxes)
        .fill(0)
        .map((_, i) =>
          Skia.XYWHRect(
            5 + ((i * Size) % (width * 0.95)),
            25 + Math.floor(i / ((width * 0.95) / Size)) * Size,
            Size * 0.5,
            Size * 0.5
          )
        ),
    [width, numberOfBoxes]
  );

  const wrapperRef = useRef(null);

  useEffect(() => {
    wrapperRef.current = null;
  }, [numberOfBoxes]);

  const draw = useCallback(
    (canvas: SkCanvas) => {
      if (wrapperRef.current === null) {
        wrapperRef.current = canvas.createWrapper(rects, paint1, paint2);
      }

      if (isDeclarative) {
        for (let i = 0; i < rects.length; i++) {
          canvas.drawRect(rects[i], paint1);
          canvas.drawRect(rects[i], paint2);
        }
      } else {
        canvas.drawPerftest(wrapperRef.current);
      }
    },
    [isDeclarative, paint1, paint2, rects]
  );

  const paint1Ref = usePaintRef();
  const paint2Ref = usePaintRef();

  return (
    <View style={styles.container}>
      <View style={styles.mode}>
        <View style={styles.panel}>
          <Button
            title="⬇️"
            onPress={() => setNumberOfBoxes((n) => Math.max(0, n - 50))}
          />
          <Text>&nbsp;Size&nbsp;</Text>
          <Text>{(numberOfBoxes * 2).toString()}</Text>
          <Text>&nbsp;</Text>
          <Button title="⬆️" onPress={() => setNumberOfBoxes((n) => n + 50)} />
        </View>
        <View style={styles.panel}>
          <Text>Use JS&nbsp;</Text>
          <Switch
            value={isDeclarative}
            onValueChange={() => setIsDeclarative((p) => !p)}
          />
        </View>
      </View>
      {/* {isDeclarative ? (
        <Canvas style={styles.container} debug mode="continuous">
          <Paint ref={paint1Ref} color="#A2AE6A" style={"fill"} />
          <Paint
            ref={paint2Ref}
            color="#4060A3"
            style="stroke"
            strokeWidth={2}
          />
          {rects.map((_, i) => (
            <React.Fragment key={i}>
              <Rect rect={rects[i]} paint={paint1Ref} />
              <Rect rect={rects[i]} paint={paint2Ref} />
            </React.Fragment>
          ))}
        </Canvas>
      ) : ( */}
      <SkiaView
        style={styles.container}
        onDraw={draw}
        debug
        mode="continuous"
      />
      {/* )} */}
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
