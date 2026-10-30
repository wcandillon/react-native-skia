import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { AndroidBackingView, AndroidCanvasProps } from "react-native-skia";
import {
  Canvas,
  Circle,
  Fill,
  LinearGradient,
  Text as SkiaText,
  useClock,
  useFont,
  vec,
} from "react-native-skia";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

// Exercises the Android backing views. The canvas is drawn with rounded
// corners inside a clipping parent and over a striped background, with an RN
// view stacked on top of it, and, while it is a SurfaceView, a second
// SurfaceView canvas (a stand-in for a video player) overlapping its corner.
// This makes the difference between the views visible at a glance: a
// TextureView keeps the clip, the alpha and the stacking order, while a
// SurfaceView punches through all of them. The zOrderOnTop switch then moves
// the SurfaceView above the whole window, and zOrderMediaOverlay above the
// other SurfaceView.
//
// The other controls reproduce what happens around a canvas. mounted mounts
// it afresh, and parent clips takes the clip away, so the stripes around a
// SurfaceView must survive its hole. shown puts a plain screen in the
// canvases' place and swaps them back in one frame; they mount again while
// hidden, so they have their pictures before the swap gives them surfaces,
// as on a screen navigated to. animate shows the frame rate of the UI thread
// while the canvas animates, and extra shapes make every frame slower to
// record.

const backingViews: AndroidBackingView[] = [
  "TextureView",
  "SurfaceView",
  "HardwareBufferView",
];
const extraShapeCounts = [0, 4000, 12000];
const extraShapeSpacing = 4;

// The options of each kind of view, see AndroidCanvasProps.
const androidProps = (
  backingView: AndroidBackingView,
  opaque: boolean,
  zOrderOnTop: boolean,
  zOrderMediaOverlay: boolean
): AndroidCanvasProps => {
  switch (backingView) {
    case "SurfaceView":
      return { backingView, opaque, zOrderOnTop, zOrderMediaOverlay };
    case "TextureView":
      return { backingView, opaque };
    case "HardwareBufferView":
      return { backingView };
  }
};

const Stripes = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {Array.from({ length: 12 }).map((_, i) => (
      <View
        key={i}
        style={[styles.stripe, { backgroundColor: i % 2 ? "#ddd" : "#bbb" }]}
      />
    ))}
  </View>
);

// Every shape is one more command the canvas replays on each frame.
const ExtraShapes = ({ count }: { count: number }) => {
  const positions = useMemo(() => {
    const columns = styles.canvas.width / extraShapeSpacing;
    const rows = styles.canvas.height / extraShapeSpacing;
    return Array.from({ length: count }, (_, i) => ({
      x: extraShapeSpacing / 2 + (i % columns) * extraShapeSpacing,
      y:
        extraShapeSpacing / 2 +
        (Math.floor(i / columns) % rows) * extraShapeSpacing,
    }));
  }, [count]);
  return (
    <>
      {positions.map(({ x, y }, i) => (
        <Circle
          key={i}
          cx={x}
          cy={y}
          r={1.5}
          color="rgba(255, 255, 255, 0.4)"
        />
      ))}
    </>
  );
};

interface ChipsProps<T extends string | number> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}

const Chips = <T extends string | number>({
  options,
  value,
  onChange,
}: ChipsProps<T>) => (
  <View style={styles.row}>
    {options.map((option) => (
      <Pressable
        key={option}
        onPress={() => onChange(option)}
        style={[styles.chip, option === value && styles.chipActive]}
      >
        <Text
          style={[styles.chipText, option === value && styles.chipTextActive]}
        >
          {option}
        </Text>
      </Pressable>
    ))}
  </View>
);

interface SwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SwitchRow = ({ label, value, onValueChange }: SwitchRowProps) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Switch value={value} onValueChange={onValueChange} />
  </View>
);

export const AndroidViews = () => {
  const [backingView, setBackingView] =
    useState<AndroidBackingView>("TextureView");
  const [opaque, setOpaque] = useState(false);
  const [zOrderOnTop, setZOrderOnTop] = useState(false);
  const [zOrderMediaOverlay, setZOrderMediaOverlay] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [shown, setShown] = useState(true);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [parentClips, setParentClips] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [extraShapes, setExtraShapes] = useState(0);
  const clock = useClock();
  const cx = useDerivedValue(
    () => 100 + 60 * Math.sin(clock.value / 500),
    [clock]
  );
  const frameRate = useSharedValue(0);
  const fps = useFrameCallback(({ timeSincePreviousFrame }) => {
    if (timeSincePreviousFrame !== null && timeSincePreviousFrame > 0) {
      frameRate.value += (1000 / timeSincePreviousFrame - frameRate.value) / 10;
    }
  });
  // The counter is only shown while animating; off, nothing should tick.
  useEffect(() => {
    fps.setActive(animate);
  }, [fps, animate]);
  const frameRateLabel = useDerivedValue(
    () => `${Math.round(frameRate.value)} fps`,
    [frameRate]
  );
  const font = useFont(require("../../assets/SF-Mono-Semibold.otf"), 18);
  // The backing view is created when the canvas mounts, so a change of the
  // chips remounts it. opaque applies in place on any view; the z-order
  // switches only matter to a SurfaceView, which moves in place on
  // zOrderOnTop from Android 11 (on Android 13 only without
  // zOrderMediaOverlay) and on zOrderMediaOverlay from Android 14, and reads
  // them at mount elsewhere.
  const surfaceView = backingView === "SurfaceView";
  const androidSurfaceView = Platform.OS === "android" && surfaceView;
  const version = Number(Platform.Version);
  const onTopAtMount =
    androidSurfaceView &&
    (version < 30 || (version === 33 && zOrderMediaOverlay));
  const mediaOverlayAtMount = androidSurfaceView && version < 34;
  const backingKey = `${backingView}-${onTopAtMount ? zOrderOnTop : ""}-${
    mediaOverlayAtMount ? zOrderMediaOverlay : ""
  }`;
  const android = androidProps(
    backingView,
    opaque,
    zOrderOnTop,
    zOrderMediaOverlay
  );
  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Stripes />
        {!shown && <View style={styles.plainScreen} />}
        <View key={hiddenCount} style={[styles.frame, !shown && styles.hidden]}>
          <View style={[styles.clip, !parentClips && styles.unclipped]}>
            {mounted && (
              <Canvas key={backingKey} style={styles.canvas} android={android}>
                <Fill>
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, 200)}
                    colors={[
                      "rgba(0, 122, 255, 0.6)",
                      "rgba(88, 86, 214, 0.6)",
                    ]}
                  />
                </Fill>
                <ExtraShapes count={extraShapes} />
                <Circle cx={animate ? cx : 100} cy={100} r={40} color="white" />
                {animate && font && (
                  <SkiaText
                    x={24}
                    y={36}
                    text={frameRateLabel}
                    font={font}
                    color="white"
                  />
                )}
              </Canvas>
            )}
          </View>
          {surfaceView && (
            <Canvas
              key={`other-${backingKey}`}
              style={styles.otherSurface}
              android={{ backingView: "SurfaceView" }}
            >
              <Fill color="#34c759" />
              {font && (
                <SkiaText
                  x={12}
                  y={28}
                  text="other SurfaceView"
                  font={font}
                  color="white"
                />
              )}
            </Canvas>
          )}
        </View>
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayText}>RN view above the canvas</Text>
        </View>
      </View>
      <ScrollView
        style={styles.controls}
        contentContainerStyle={styles.controlsContent}
      >
        <Text style={styles.label}>android.backingView</Text>
        <Chips
          options={backingViews}
          value={backingView}
          onChange={setBackingView}
        />
        <SwitchRow
          label="android.opaque"
          value={opaque}
          onValueChange={setOpaque}
        />
        <SwitchRow
          label="android.zOrderOnTop (SurfaceView only)"
          value={zOrderOnTop}
          onValueChange={setZOrderOnTop}
        />
        <SwitchRow
          label="android.zOrderMediaOverlay (SurfaceView only)"
          value={zOrderMediaOverlay}
          onValueChange={setZOrderMediaOverlay}
        />
        <SwitchRow label="mounted" value={mounted} onValueChange={setMounted} />
        <SwitchRow
          label="shown"
          value={shown}
          onValueChange={(value) => {
            setShown(value);
            if (!value) {
              setHiddenCount((count) => count + 1);
            }
          }}
        />
        <SwitchRow
          label="parent clips"
          value={parentClips}
          onValueChange={setParentClips}
        />
        <SwitchRow label="animate" value={animate} onValueChange={setAnimate} />
        <Text style={styles.label}>extra shapes</Text>
        <Chips
          options={extraShapeCounts}
          value={extraShapes}
          onChange={setExtraShapes}
        />
        <Text style={styles.hint}>
          The backing view is created when the canvas mounts: a chip remounts
          the canvas (HardwareBufferView is not available in Skia yet and falls
          back to a TextureView, with a warning). opaque applies in place, and
          so does zOrderOnTop on Android 11 and later (on Android 13 only
          without zOrderMediaOverlay) and zOrderMediaOverlay on Android 14 and
          later. A SurfaceView ignores the rounded clip and the overlay; with
          zOrderOnTop it also covers the controls when they overlap, and with
          zOrderMediaOverlay it moves above the other SurfaceView.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  stage: {
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  stripe: {
    flex: 1,
  },
  frame: {
    width: 260,
    height: 200,
  },
  clip: {
    width: 260,
    height: 200,
    borderRadius: 32,
    overflow: "hidden",
    transform: [{ rotate: "-6deg" }],
  },
  unclipped: {
    overflow: "visible",
  },
  hidden: {
    display: "none",
  },
  plainScreen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#ff9500",
  },
  canvas: {
    width: 260,
    height: 200,
  },
  otherSurface: {
    position: "absolute",
    right: -40,
    bottom: -30,
    width: 180,
    height: 90,
  },
  overlay: {
    position: "absolute",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 59, 48, 0.85)",
  },
  overlayText: {
    color: "white",
    fontWeight: "bold",
  },
  controls: {
    flex: 1,
  },
  controlsContent: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontWeight: "bold",
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#999",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "#007aff",
    borderColor: "#007aff",
  },
  chipText: {
    color: "#333",
  },
  chipTextActive: {
    color: "white",
  },
  hint: {
    color: "#666",
  },
});
