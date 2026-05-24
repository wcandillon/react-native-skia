import type { RefObject } from "react";
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Switch,
  Button,
  StyleSheet,
  Pressable,
  ScrollView,
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
import { WebView } from "react-native-webview";

// Demo for the new HWUI/RenderNode-based view snapshot path on Android.
// The scrollable scene below packs every native primitive the legacy
// software-canvas pipeline used to mangle: `elevation` shadows, native
// `Switch`/`Button` controls, rounded clipping with overflow children, root
// padding (which the legacy traversal double-counted), a nested transform,
// a Skia Canvas (TextureView) and a WebView. The reveal slider overlays the
// snapshot on top of the live viewport — with the new path the seam is
// invisible.
const TIGER_SIZE = 140;
const HANDLE_WIDTH = 44;

const WEBVIEW_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    color: white;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    padding: 16px; box-sizing: border-box;
    text-align: center;
  }
  h2 { margin: 0 0 6px; font-size: 18px; }
  p  { margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.4; }
  .pill {
    margin-top: 10px; padding: 4px 10px;
    background: rgba(255,255,255,0.2);
    border-radius: 999px; font-size: 11px;
    letter-spacing: 0.5px; text-transform: uppercase;
  }
</style>
</head>
<body>
  <h2>Hello from a WebView</h2>
  <p>Chromium WebView pixels captured by the HWUI snapshot path.</p>
  <div class="pill">react-native-webview</div>
</body>
</html>
`;

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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Scene />
          </ScrollView>
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

        {hasSnapshot && (
          <Pressable style={styles.fabSecondary} onPress={reset}>
            <Text style={styles.fabSecondaryText}>Reset</Text>
          </Pressable>
        )}
        <Pressable style={styles.fab} onPress={takeSnapshot}>
          <Text style={styles.fabIcon}>📸</Text>
          <Text style={styles.fabLabel}>
            {hasSnapshot ? "Retake" : "Snapshot"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>
          Legacy software-canvas used to break:
        </Text>
        <Text style={styles.legendItem}>
          shadows · padding · rounded clipping · native controls · Skia Canvas ·
          WebView — drag the divider to compare.
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

      <View style={styles.webviewCard}>
        <Text style={styles.cardTitle}>WebView</Text>
        <Text style={styles.cardBody}>
          A Chromium WebView. The legacy software canvas never captured live web
          content; the new HWUI path pulls pixels straight from the WebView's
          surface.
        </Text>
        <View style={styles.webviewFrame}>
          <WebView
            originWhitelist={["*"]}
            source={{ html: WEBVIEW_HTML }}
            style={styles.webview}
            scrollEnabled={false}
            androidLayerType="hardware"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0e0f12",
  },
  sceneWrapper: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  scene: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  scenePadded: {
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
  webviewCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  webviewFrame: {
    marginTop: 12,
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
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
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#fbbf24",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 18,
  },
  fabLabel: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  fabSecondary: {
    position: "absolute",
    right: 16,
    bottom: 80,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  fabSecondaryText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  legend: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0e0f12",
  },
  legendTitle: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  legendItem: {
    color: "#d1d5db",
    fontSize: 12,
    lineHeight: 17,
  },
});
