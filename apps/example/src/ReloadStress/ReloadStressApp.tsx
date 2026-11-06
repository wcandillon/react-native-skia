/**
 * Reproduction for https://github.com/Shopify/react-native-skia/issues/4003
 *
 * Repeatedly recreates the JS runtime (DevSettings.reload() -> ReactHost.reload()
 * on bridgeless Android — the same native path expo-updates' reloadAsync() takes)
 * while keeping Skia native-object creation hot on the JS thread. Two failure
 * modes are expected on affected versions (2.10.0+):
 *
 * 1. Native SIGSEGV in RNSkia::RNSkManager::installBindings during the
 *    reload (visible as a tombstone in adb logcat), caused by a stale
 *    prototype cache entry from the destroyed runtime.
 * 2. `Skia` (the module-scope snapshot of global.SkiaApi) undefined on the
 *    fresh runtime even though NativeSkiaModule.install() returned true —
 *    logged below as "SYMPTOM-2".
 */
import React, { useEffect, useMemo, useState } from "react";
import { DevSettings, Platform, StyleSheet, Text, View } from "react-native";
import { Canvas, Fill, Path, Skia } from "@shopify/react-native-skia";

const TAG = "[ReloadStress]";

// Module-scope binding check, mirroring what src/skia/core/Typeface.ts does
// at import time (`Skia.Typeface.MakeFreeTypeFaceFromData.bind(...)`), which
// is where the TypeError surfaces in production.
const bindingsError = (() => {
  try {
    if (Skia == null) {
      return "Skia (global.SkiaApi snapshot) is undefined";
    }
    if (Skia.Typeface == null) {
      return "Skia.Typeface is undefined";
    }
    if (typeof Skia.Typeface.MakeFreeTypeFaceFromData !== "function") {
      return "Skia.Typeface.MakeFreeTypeFaceFromData is not a function";
    }
    // Exercise the exact production code path.
    Skia.Typeface.MakeFreeTypeFaceFromData.bind(Skia.Typeface);
    return null;
  } catch (e) {
    return `threw: ${e}`;
  }
})();

if (bindingsError != null) {
  console.error(
    `${TAG} SYMPTOM-2: bindings missing on fresh runtime — ${bindingsError}`
  );
} else {
  console.log(`${TAG} runtime up, Skia bindings ok`);
}

// Delay before triggering the next reload. Randomized so the reload lands at
// varied points of the startup/render pipeline — the race is timing-dependent.
const reloadDelay = 300 + Math.floor(Math.random() * 1500);

const makeChurnPath = (tick: number) => {
  const path = Skia.Path.Make();
  for (let i = 0; i < 40; i++) {
    const r = 10 + ((tick + i * 7) % 60);
    path.addCircle(60 + ((tick * 3 + i * 31) % 200), 80 + ((i * 53) % 300), r);
  }
  return path;
};

export const ReloadStressApp = () => {
  const [tick, setTick] = useState(0);

  // Keep native object creation hot on the JS thread: every frame creates
  // paths, paints, colors and matrices (NativeObject::create traffic) so a
  // reload is likely to land while JSI objects are in flight.
  useEffect(() => {
    let running = true;
    let raf = 0;
    const loop = () => {
      if (!running) {
        return;
      }
      const p = Skia.Path.Make();
      for (let i = 0; i < 50; i++) {
        p.addCircle(50 + i, 50, 20);
      }
      const paint = Skia.Paint();
      paint.setColor(Skia.Color("cyan"));
      const m = Skia.Matrix();
      m.translate(1, 1);
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    console.log(
      `${TAG} process uptime ${Math.round(
        performance.now() / 1000
      )}s — scheduling runtime reload in ${reloadDelay}ms`
    );
    const t = setTimeout(() => {
      console.log(`${TAG} reloading JS runtime now`);
      DevSettings.reload("Skia reload stress (#4003)");
    }, reloadDelay);
    return () => clearTimeout(t);
  }, []);

  const path = useMemo(() => makeChurnPath(tick), [tick]);

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Fill color="black" />
        <Path path={path} color="cyan" style="stroke" strokeWidth={2} />
      </Canvas>
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.text}>
          #4003 reload stress ({Platform.OS}){"\n"}
          bindings: {bindingsError ?? "ok"}
          {"\n"}
          process uptime: {Math.round(performance.now() / 1000)}s{"\n"}
          next reload in {reloadDelay}ms
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  canvas: { flex: 1 },
  overlay: { position: "absolute", top: 60, left: 20 },
  text: { color: "white", fontSize: 14 },
});
