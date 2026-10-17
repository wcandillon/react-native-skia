import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { AndroidSurfaceType } from "react-native-skia";
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
// view stacked on top of it. This makes the difference between the two views
// visible at a glance: a TextureView keeps the clip, the alpha and the
// stacking order, while a SurfaceView punches through all of them. The
// zOrderOnTop switch then moves the SurfaceView above the whole window.
//
// The other controls reproduce what happens around a canvas. mounted mounts
// it afresh, and parent clips takes the clip away, so the stripes around a
// SurfaceView must survive its hole. shown puts a plain screen in the
// canvas's place and swaps the canvas back in one frame; the canvas mounts
// again while hidden, so it has its picture before the swap gives it a
// surface, as on a screen navigated to. animate shows the frame rate of the
// UI thread while the canvas animates, and extra shapes make every frame
// slower to record.

type SurfaceType = "auto" | AndroidSurfaceType;

const surfaceTypes: SurfaceType[] = ["auto", "SurfaceView", "TextureView"];
const extraShapeCounts = [0, 4000, 12000];
const extraShapeSpacing = 4;

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
  const [surfaceType, setSurfaceType] = useState<SurfaceType>("auto");
  const [opaque, setOpaque] = useState(false);
  const [zOrderOnTop, setZOrderOnTop] = useState(false);
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
  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Stripes />
        {!shown && <View style={styles.plainScreen} />}
        <View
          key={hiddenCount}
          style={[
            styles.frame,
            parentClips && styles.clip,
            !shown && styles.hidden,
          ]}
        >
          {mounted && (
            <Canvas
              style={styles.canvas}
              opaque={opaque}
              android={{
                surfaceType: surfaceType === "auto" ? undefined : surfaceType,
                zOrderOnTop,
              }}
            >
              <Fill>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, 200)}
                  colors={["rgba(0, 122, 255, 0.6)", "rgba(88, 86, 214, 0.6)"]}
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
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayText}>RN view above the canvas</Text>
        </View>
      </View>
      <ScrollView
        style={styles.controls}
        contentContainerStyle={styles.controlsContent}
      >
        <Text style={styles.label}>android.surfaceType</Text>
        <Chips
          options={surfaceTypes}
          value={surfaceType}
          onChange={setSurfaceType}
        />
        <SwitchRow label="opaque" value={opaque} onValueChange={setOpaque} />
        <SwitchRow
          label="android.zOrderOnTop (SurfaceView only)"
          value={zOrderOnTop}
          onValueChange={setZOrderOnTop}
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
          auto picks SurfaceView when opaque and TextureView otherwise. A
          SurfaceView ignores the rounded clip and the overlay; with zOrderOnTop
          it also covers the controls when they overlap.
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
    borderRadius: 32,
    transform: [{ rotate: "-6deg" }],
  },
  clip: {
    overflow: "hidden",
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
