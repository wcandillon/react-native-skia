import type { RefObject } from "react";
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Switch,
  Button,
  StyleSheet,
  Pressable,
} from "react-native";
import type { SkImage } from "@shopify/react-native-skia";
import {
  Canvas,
  Group,
  Image as SkiaImage,
  ImageSVG,
  rect,
  useSVG,
  makeImageFromView,
} from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  clamp,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// Demo for the new HWUI/RenderNode-based view snapshot path on Android.
// The scene below packs every native primitive the legacy software-canvas
// pipeline used to mangle: `elevation` shadows, native `Switch`/`Button`
// controls, rounded clipping with overflow children, root padding (which the
// legacy traversal double-counted) and a nested transform. With the new
// pipeline the snapshot is pixel-identical to the live view, which makes the
// reveal slider's seam invisible.
const SCENE_HEIGHT = 680;
const TIGER_SIZE = 140;

export const SnapshotDemo = () => {
  const viewRef = useRef<View>(null);
  const image = useSharedValue<SkImage | null>(null);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const dividerX = useSharedValue(0);

  const takeSnapshot = useCallback(async () => {
    if (viewRef.current == null) {
      return;
    }
    const snapshot = await makeImageFromView(viewRef as RefObject<View>);
    image.value = snapshot;
    dividerX.value = sceneSize.width / 2;
    setHasSnapshot(true);
  }, [image, dividerX, sceneSize.width]);

  const reset = useCallback(() => {
    image.value = null;
    setHasSnapshot(false);
  }, [image]);

  const clipRect = useDerivedValue(() =>
    rect(
      dividerX.value,
      0,
      Math.max(0, sceneSize.width - dividerX.value),
      sceneSize.height
    )
  );

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dividerX.value - HANDLE_WIDTH / 2 }],
  }));

  const gesture = Gesture.Pan().onChange((e) => {
    dividerX.value = clamp(dividerX.value + e.changeX, 0, sceneSize.width);
  });

  return (
    <View style={styles.root}>
      <View
        style={styles.sceneWrapper}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setSceneSize({ width, height });
          dividerX.value = width / 2;
        }}
      >
        <View ref={viewRef} style={styles.scene} collapsable={false}>
          <Scene />
        </View>

        {hasSnapshot && sceneSize.width > 0 && (
          <>
            <Canvas
              style={[
                StyleSheet.absoluteFill,
                { width: sceneSize.width, height: sceneSize.height },
              ]}
              pointerEvents="none"
            >
              <Group clip={clipRect}>
                <SkiaImage
                  image={image}
                  x={0}
                  y={0}
                  width={sceneSize.width}
                  height={sceneSize.height}
                  fit="fill"
                />
              </Group>
            </Canvas>
            <GestureDetector gesture={gesture}>
              <Animated.View
                style={[
                  styles.handleHitArea,
                  { height: sceneSize.height },
                  handleStyle,
                ]}
              >
                <View style={styles.handleLine} />
                <View style={styles.handleKnob}>
                  <Text style={styles.handleKnobText}>‹ ›</Text>
                </View>
              </Animated.View>
            </GestureDetector>
            <View pointerEvents="none" style={styles.labelLive}>
              <Text style={styles.labelText}>LIVE VIEW</Text>
            </View>
            <View pointerEvents="none" style={styles.labelSnapshot}>
              <Text style={styles.labelText}>SNAPSHOT</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.primaryButton} onPress={takeSnapshot}>
          <Text style={styles.primaryButtonText}>
            {hasSnapshot ? "Retake snapshot" : "Take snapshot"}
          </Text>
        </Pressable>
        {hasSnapshot && (
          <Pressable style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>
          What the legacy software-canvas path used to break
        </Text>
        <Text style={styles.legendItem}>
          • Elevation shadows on the card below
        </Text>
        <Text style={styles.legendItem}>
          • Root padding (counted twice, children rendered shifted)
        </Text>
        <Text style={styles.legendItem}>
          • Rounded clipping with overflow children (cyan bar)
        </Text>
        <Text style={styles.legendItem}>• Native Switch / Button controls</Text>
        <Text style={styles.legendItem}>
          • Skia Canvas children (tiger.svg in a TextureView)
        </Text>
        <Text style={styles.legendItem}>
          • Drag the divider — the snapshot now matches the live view 1:1
        </Text>
      </View>
    </View>
  );
};

const Scene = () => {
  const [switchOn, setSwitchOn] = useState(true);
  const [counter, setCounter] = useState(0);
  const tiger = useSVG(require("./tiger.svg"));
  return (
    <View style={styles.scenePadded}>
      <View style={styles.elevatedCard}>
        <Text style={styles.cardTitle}>Elevated card</Text>
        <Text style={styles.cardBody}>
          elevation: 12 with a soft drop shadow. The old path drew this as a
          flat white rectangle.
        </Text>
      </View>

      <View style={styles.roundedClipRow}>
        <View style={styles.roundedClip}>
          <View style={styles.overflowingBar} />
          <Text style={styles.clipLabel}>rounded + overflow</Text>
        </View>
        <View style={styles.controlsColumn}>
          <Switch value={switchOn} onValueChange={setSwitchOn} />
          <View style={{ height: 8 }} />
          <Button
            title={`Tap (${counter})`}
            onPress={() => setCounter((c) => c + 1)}
          />
        </View>
      </View>

      <View style={styles.gradientCard}>
        <Text style={styles.gradientTitle}>Translated child</Text>
        <View style={styles.translatedChild}>
          <Text style={styles.translatedText}>
            transform: translate + rotate
          </Text>
        </View>
      </View>

      <View style={styles.svgCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Skia Canvas (SVG)</Text>
          <Text style={styles.cardBody}>
            tiger.svg rendered through a Skia Canvas (TextureView). The legacy
            traversal drew this as a flat bitmap copy and dropped overlapping
            siblings.
          </Text>
        </View>
        <Canvas style={{ width: TIGER_SIZE, height: TIGER_SIZE }}>
          <ImageSVG
            svg={tiger}
            x={0}
            y={0}
            width={TIGER_SIZE}
            height={TIGER_SIZE}
          />
        </Canvas>
      </View>
    </View>
  );
};

const HANDLE_WIDTH = 44;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0e0f12",
  },
  sceneWrapper: {
    height: SCENE_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  scene: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  scenePadded: {
    flex: 1,
    padding: 24,
  },
  elevatedCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  cardBody: {
    marginTop: 6,
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  roundedClipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  roundedClip: {
    width: 140,
    height: 100,
    borderRadius: 18,
    backgroundColor: "#fbcfe8",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  overflowingBar: {
    position: "absolute",
    top: 30,
    left: -40,
    width: 260,
    height: 14,
    backgroundColor: "#0891b2",
  },
  clipLabel: {
    fontSize: 12,
    color: "#831843",
    fontWeight: "600",
  },
  controlsColumn: {
    flex: 1,
    marginLeft: 20,
    alignItems: "flex-start",
  },
  gradientCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#1f2937",
    borderRadius: 12,
    height: 140,
    overflow: "hidden",
  },
  gradientTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  translatedChild: {
    position: "absolute",
    right: 16,
    bottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    transform: [{ rotate: "-8deg" }, { translateX: -4 }],
  },
  translatedText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 12,
  },
  svgCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  handleHitArea: {
    position: "absolute",
    top: 0,
    width: HANDLE_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  handleLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: HANDLE_WIDTH / 2 - 1,
    width: 2,
    backgroundColor: "#fbbf24",
  },
  handleKnob: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fbbf24",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  handleKnobText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 16,
  },
  labelLive: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
  },
  labelSnapshot: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(217, 119, 6, 0.85)",
  },
  labelText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  controls: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#0e0f12",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#fbbf24",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
  },
  legend: {
    flex: 1,
    padding: 16,
    backgroundColor: "#0e0f12",
  },
  legendTitle: {
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  legendItem: {
    color: "#d1d5db",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
