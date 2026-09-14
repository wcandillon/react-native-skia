import {
  Canvas,
  Circle,
  Fill,
  Line,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// Each panel exercises the web renderer lifecycle rewritten for #3829, where
// the WebGL renderer was previously only constructed from a layout event
// (wrapper div → global ResizeObserver → setTimeout(0)).

// The layout from the #3829 report: a fixed-size canvas next to an
// absolutely-positioned sibling overlay. In the affected environments the
// layout event never fired, no renderer was ever constructed, and the canvas
// stayed fully transparent (the tomato background shows through).
const OverlayRepro = () => {
  return (
    <View style={styles.tomato}>
      <View style={styles.overlay}>
        <Text style={styles.overlayLabel}>absolute overlay</Text>
      </View>
      <Canvas style={styles.fixedCanvas}>
        <Fill color="lime" />
        <Circle cx={120} cy={110} r={60} color="black" style="stroke" />
        <Circle cx={120} cy={110} r={40} color="black" />
      </Canvas>
    </View>
  );
};

// Fine detail that only stays crisp if the surface tracks the actual pixel
// density. The old implementation froze the density at module load and got
// no event for density-only changes, so browser zoom or moving the window
// to a display with a different DPI left the canvas blurry forever.
const spokes = new Array(24).fill(0).map((_, i) => (i * Math.PI * 2) / 24);
const rings = new Array(20).fill(0).map((_, i) => 6 + i * 4.5);
const PixelDensity = () => {
  const [dpr, setDpr] = useState(
    typeof window === "undefined" ? 1 : window.devicePixelRatio
  );
  useEffect(() => {
    if (Platform.OS !== "web") {
      return undefined;
    }
    // Browser zoom fires a window resize; good enough for the readout.
    const update = () => setDpr(window.devicePixelRatio);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return (
    <View style={styles.row}>
      <View testID="rings">
        <Canvas style={styles.squareCanvasLarge}>
          <Fill color="white" />
          {rings.map((r) => (
            <Circle
              key={r}
              cx={100}
              cy={100}
              r={r}
              color="black"
              style="stroke"
              strokeWidth={0.5}
            />
          ))}
          {spokes.map((a) => (
            <Line
              key={a}
              p1={vec(100 + Math.cos(a) * 20, 100 + Math.sin(a) * 20)}
              p2={vec(100 + Math.cos(a) * 95, 100 + Math.sin(a) * 95)}
              color="black"
              strokeWidth={0.5}
            />
          ))}
        </Canvas>
      </View>
      {Platform.OS === "web" && (
        <Text style={styles.status}>devicePixelRatio: {dpr}</Text>
      )}
    </View>
  );
};

// A canvas that mounts with zero height and is revealed later. The renderer
// must tolerate being constructed without a measurable canvas and paint as
// soon as it gets a size.
const RevealAfterMount = () => {
  const [revealed, setRevealed] = useState(false);
  return (
    <View>
      <Pressable style={styles.button} onPress={() => setRevealed((r) => !r)}>
        <Text style={styles.buttonLabel}>
          {revealed ? "Collapse" : "Reveal"}
        </Text>
      </Pressable>
      <View style={{ height: revealed ? 160 : 0, overflow: "hidden" }}>
        <Canvas style={{ width: "100%", height: 160 }}>
          <Fill color="#0fa47a" />
          <Rect x={20} y={20} width={80} height={120} color="white" />
          <Circle cx={180} cy={80} r={50} color="#ffd60a" />
        </Canvas>
      </View>
    </View>
  );
};

// Continuously resizing canvas. The old implementation repainted a resize
// from a setTimeout(0) after the browser had already painted the new layout,
// so the content visibly stretched and lagged during the animation. The
// fixed one recreates the surface and repaints before paint, in the
// ResizeObserver callback.
const stripes = new Array(30).fill(0).map((_, i) => i * 24);
const ResizeStress = () => {
  const width = useSharedValue(120);
  useEffect(() => {
    width.value = withRepeat(withTiming(340, { duration: 2000 }), -1, true);
  }, [width]);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View style={style}>
      <Canvas style={{ width: "100%", height: 120 }}>
        <Fill color="#1c1c1e" />
        {stripes.map((x) => (
          <Rect key={x} x={x} y={0} width={12} height={120} color="#ffd60a" />
        ))}
      </Canvas>
    </Animated.View>
  );
};

interface PanelProps {
  title: string;
  expected: string;
  children: React.ReactNode;
}

const Panel = ({ title, expected, children }: PanelProps) => (
  <View style={styles.panel}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.expected}>{expected}</Text>
    {children}
  </View>
);

export const WebLayout = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Panel
        title="1. Canvas under an absolute overlay (#3829)"
        expected="Expected: lime canvas with two circles. Broken: transparent canvas, tomato shows through (reproduces in environments where the layout event never fires)."
      >
        <OverlayRepro />
      </Panel>
      <Panel
        title="2. Pixel density"
        expected="Zoom the browser (Cmd/Ctrl +/-) or move the window to a display with a different DPI. Expected: the rings re-render crisp. Broken: they stay blurry forever."
      >
        <PixelDensity />
      </Panel>
      <Panel
        title="3. Canvas revealed after mount"
        expected="Expected: the painting appears as soon as it is revealed, with no console errors."
      >
        <RevealAfterMount />
      </Panel>
      <Panel
        title="4. Continuous resize"
        expected="Expected: the stripes stay locked in place while the canvas resizes. Broken: the content stretches and shimmers during the animation."
      >
        <ResizeStress />
      </Panel>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
  },
  panel: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  expected: {
    fontSize: 13,
    color: "#666",
  },
  tomato: {
    backgroundColor: "tomato",
    height: 240,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 10,
    justifyContent: "center",
    paddingLeft: 12,
  },
  overlayLabel: {
    color: "white",
  },
  fixedCanvas: {
    width: 240,
    height: 200,
    alignSelf: "center",
    marginTop: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  squareCanvasLarge: {
    width: 200,
    height: 200,
  },
  status: {
    fontSize: 14,
    flexShrink: 1,
  },
  button: {
    backgroundColor: "#3884ff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  buttonLabel: {
    color: "white",
    fontWeight: "bold",
  },
});
