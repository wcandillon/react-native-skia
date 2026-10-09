import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Canvas, Circle, Fill } from "@shopify/react-native-skia";
import type { SkSize } from "@shopify/react-native-skia";
import {
  runOnJS,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * Repro harness for https://github.com/Shopify/react-native-skia/issues/4006
 *
 * Reported symptom (iOS, Fabric, real device, after prolonged usage): the first
 * tap on a Touchable next to a focused multiline TextInput is swallowed — the
 * keyboard closes but Pressability never fires. The second tap works. The Skia
 * canvas is on a *different* screen that was visited earlier in the session and
 * is therefore still mounted (pushed under the current screen in a native
 * stack), even though it is not visible.
 *
 * The harness is a nested 2-screen stack:
 *
 *   1. "Canvas"  — holds the <Canvas />. Configure it, then push the chat
 *                  screen. The canvas screen stays mounted underneath.
 *   2. "Chat"    — an input bar (multiline TextInput + send button) outside a
 *                  ScrollView, i.e. the layout where a tap on the button should
 *                  *always* reach onPress regardless of keyboard state.
 *
 * A tap is counted as LOST when the raw `onTouchStart` on the button's wrapper
 * fires but the Touchable's `onPress` never does. `onTouchStart` is dispatched
 * by ReactNativeBridgeEventPlugin to the target and its ancestors and is *not*
 * subject to responder negotiation, so it still fires when the responder is
 * stolen — which is exactly the failure mode described in the issue.
 *
 * The toggles let you A/B the suspects without reinstalling anything:
 *   - "onSize"    — Canvas onSize={} moved to a Reanimated useFrameCallback in
 *                   #3500 (v2.3.10). That runs measure() on the *main thread*
 *                   every frame for as long as the Canvas is mounted, including
 *                   while its screen is hidden.
 *   - "animated"  — keeps the (hidden) canvas re-rendering/redrawing, which
 *                   keeps [_layer nextDrawable] running on the main thread.
 *   - "canvas"    — no Canvas at all: the control.
 *
 * The UI-thread frame meter at the top of the chat screen reports the worst
 * frame delta seen; a main-thread stall shows up there as a spike.
 */

interface Config {
  mountCanvas: boolean;
  useOnSize: boolean;
  animated: boolean;
  persistTaps: boolean;
}

const ConfigContext = createContext<{
  config: Config;
  setConfig: (c: Config) => void;
}>({
  config: {
    mountCanvas: true,
    useOnSize: true,
    animated: true,
    persistTaps: false,
  },
  setConfig: () => {},
});

type ReproRoutes = {
  KeyboardTapReproCanvas: undefined;
  KeyboardTapReproChat: undefined;
};

const Stack = createNativeStackNavigator<ReproRoutes>();

// ---------------------------------------------------------------------------
// Screen 1 — the canvas screen. Stays mounted under the chat screen.
// ---------------------------------------------------------------------------

const AnimatedCanvas = ({
  useOnSize,
  animated,
}: {
  useOnSize: boolean;
  animated: boolean;
}) => {
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
    } else {
      progress.value = 0.5;
    }
  }, [animated, progress]);

  const cx = useDerivedValue(() => 40 + progress.value * 200);
  const r = useDerivedValue(() => 20 + progress.value * 20);

  // Deliberately passing `onSize` conditionally: this is the code path added in
  // #3500 that installs a per-frame main-thread measure() loop.
  return (
    <Canvas
      style={styles.canvas}
      onSize={useOnSize ? size : undefined}
      testID="repro-canvas"
    >
      <Fill color="#111827" />
      <Circle cx={cx} cy={60} r={r} color="#22d3ee" />
    </Canvas>
  );
};

const Row = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Switch value={value} onValueChange={onValueChange} />
  </View>
);

const CanvasScreen = () => {
  const { config, setConfig } = useContext(ConfigContext);
  const navigation = useNavigation<NativeStackNavigationProp<ReproRoutes>>();
  return (
    <ScrollView contentContainerStyle={styles.canvasScreen}>
      <Text style={styles.title}>Step 1 — configure, then open the chat</Text>
      {config.mountCanvas ? (
        <AnimatedCanvas
          // Remount the canvas when the config changes so the effect re-runs.
          key={`${config.useOnSize}-${config.animated}`}
          useOnSize={config.useOnSize}
          animated={config.animated}
        />
      ) : (
        <View style={[styles.canvas, styles.canvasPlaceholder]}>
          <Text style={styles.placeholderText}>no canvas (control)</Text>
        </View>
      )}
      <Row
        label="Mount <Canvas /> on this screen"
        value={config.mountCanvas}
        onValueChange={(v) => setConfig({ ...config, mountCanvas: v })}
      />
      <Row
        label="Pass onSize={} to the Canvas"
        value={config.useOnSize}
        onValueChange={(v) => setConfig({ ...config, useOnSize: v })}
      />
      <Row
        label="Animate the Canvas"
        value={config.animated}
        onValueChange={(v) => setConfig({ ...config, animated: v })}
      />
      <Row
        label='ScrollView keyboardShouldPersistTaps="handled"'
        value={config.persistTaps}
        onValueChange={(v) => setConfig({ ...config, persistTaps: v })}
      />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("KeyboardTapReproChat")}
      >
        <Text style={styles.primaryButtonText}>Open chat screen →</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        This screen stays mounted underneath the chat screen, exactly like the
        setup described in issue #4006.
      </Text>
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Screen 2 — the chat screen. No canvas here.
// ---------------------------------------------------------------------------

interface Stats {
  rawTouches: number;
  pressIns: number;
  presses: number;
  cancels: number;
  lastLostAt: string | null;
}

const initialStats: Stats = {
  rawTouches: 0,
  pressIns: 0,
  presses: 0,
  cancels: 0,
  lastLostAt: null,
};

const ChatScreen = () => {
  const { config } = useContext(ConfigContext);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [worstFrame, setWorstFrame] = useState(0);
  const [worstJs, setWorstJs] = useState(0);

  // A touch that started on the button but never produced an onPress.
  const pendingTouch = useRef(false);

  const onTouchStart = useCallback(() => {
    pendingTouch.current = true;
    setStats((s) => ({ ...s, rawTouches: s.rawTouches + 1 }));
    // Give the responder system a couple of frames to deliver onPress.
    setTimeout(() => {
      if (pendingTouch.current) {
        pendingTouch.current = false;
        setStats((s) => ({
          ...s,
          lastLostAt: new Date().toISOString().slice(11, 23),
        }));

        console.warn("[#4006] LOST TAP — onTouchStart without onPress");
      }
    }, 400);
  }, []);

  const onTouchCancel = useCallback(() => {
    setStats((s) => ({ ...s, cancels: s.cancels + 1 }));
  }, []);

  const onPressIn = useCallback(() => {
    setStats((s) => ({ ...s, pressIns: s.pressIns + 1 }));
  }, []);

  const onPress = useCallback(() => {
    pendingTouch.current = false;
    setStats((s) => ({ ...s, presses: s.presses + 1 }));
    setMessages((m) => [...m, text || `message ${m.length + 1}`]);
    setText("");
  }, [text]);

  // --- UI (main) thread frame meter ---------------------------------------
  const worst = useSharedValue(0);
  const onFrame = useCallback(
    (info: { timeSincePreviousFrame: number | null }) => {
      "worklet";
      const delta = info.timeSincePreviousFrame ?? 0;
      if (delta > worst.value) {
        worst.value = delta;
        runOnJS(setWorstFrame)(Math.round(delta));
      }
    },
    [worst]
  );
  useFrameCallback(onFrame, true);

  // --- JS thread stall meter ----------------------------------------------
  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const drift = now - last - 16;
      last = now;
      setWorstJs((w) => (drift > w ? Math.round(drift) : w));
    }, 16);
    return () => clearInterval(id);
  }, []);

  const lost = Math.max(0, stats.rawTouches - stats.presses);
  const reset = useCallback(() => {
    setStats(initialStats);
    setWorstFrame(0);
    setWorstJs(0);
    worst.value = 0;
  }, [worst]);

  const summary = useMemo(
    () =>
      `touches ${stats.rawTouches} · pressIn ${stats.pressIns} · press ${stats.presses} · cancel ${stats.cancels}`,
    [stats]
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.banner, lost > 0 && styles.bannerBad]}>
        <Text style={styles.bannerText}>
          {lost > 0 ? `⚠️ LOST TAPS: ${lost}` : "no lost taps yet"}
        </Text>
        <Text style={styles.bannerSub}>{summary}</Text>
        <Text style={styles.bannerSub}>
          worst UI frame {worstFrame}ms · worst JS tick {worstJs}ms
        </Text>
        {stats.lastLostAt ? (
          <Text style={styles.bannerSub}>last lost at {stats.lastLostAt}</Text>
        ) : null}
        <TouchableOpacity onPress={reset}>
          <Text style={styles.resetText}>reset counters</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps={config.persistTaps ? "handled" : "never"}
      >
        <Text style={styles.hint}>
          Focus the input so the keyboard is up, then tap SEND. Repeat for a few
          minutes — the issue only shows up after prolonged usage. Every tap
          that starts on SEND but never fires onPress is counted above.
        </Text>
        {messages.map((m, i) => (
          <View key={i} style={styles.bubble}>
            <Text style={styles.bubbleText}>{m}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor="#9ca3af"
          multiline
        />
        {/* onTouchStart/onTouchCancel are dispatched outside of responder
            negotiation, so they still fire when the tap is swallowed. */}
        <View onTouchStart={onTouchStart} onTouchCancel={onTouchCancel}>
          <TouchableOpacity
            style={styles.sendButton}
            onPressIn={onPressIn}
            onPress={onPress}
          >
            <Text style={styles.sendText}>SEND</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------

export const KeyboardTapRepro = () => {
  const [config, setConfig] = useState<Config>({
    mountCanvas: true,
    useOnSize: true,
    animated: true,
    persistTaps: false,
  });
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return (
    <ConfigContext.Provider value={value}>
      <Stack.Navigator>
        <Stack.Screen
          name="KeyboardTapReproCanvas"
          component={CanvasScreen}
          options={{ title: "1. Canvas screen" }}
        />
        <Stack.Screen
          name="KeyboardTapReproChat"
          component={ChatScreen}
          options={{ title: "2. Chat screen (no canvas)" }}
        />
      </Stack.Navigator>
    </ConfigContext.Provider>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  canvasScreen: { padding: 16 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  canvas: { height: 120, borderRadius: 8, overflow: "hidden" },
  canvasPlaceholder: {
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#6b7280" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowLabel: { flex: 1, paddingRight: 12 },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: { color: "white", fontWeight: "600" },
  hint: { color: "#6b7280", fontSize: 12, marginTop: 12 },
  banner: { padding: 12, backgroundColor: "#ecfdf5" },
  bannerBad: { backgroundColor: "#fee2e2" },
  bannerText: { fontWeight: "700" },
  bannerSub: { fontSize: 12, color: "#374151", marginTop: 2 },
  resetText: { fontSize: 12, color: "#2563eb", marginTop: 6 },
  messages: { padding: 12 },
  bubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  bubbleText: { color: "white" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d1d5db",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#16a34a",
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "white", fontWeight: "700" },
});
