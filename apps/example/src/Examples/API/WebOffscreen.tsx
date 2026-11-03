import React, { useEffect, useState } from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AlphaType,
  Canvas,
  ColorType,
  Fill,
  Image,
  Skia,
} from "react-native-skia";
import type { SkImage } from "react-native-skia";
import type { CanvasKit as CanvasKitType } from "canvaskit-wasm";
import { peekSharedWebGLContext } from "react-native-skia/src/skia/web/SharedWebGLContext";

// Skia.Surface.MakeOffscreen() on web is a render target on the WebGL
// context the page shares with its canvases: no context of its own (a
// context per surface, never released, used to get the oldest live context
// evicted past the browser's limit of 16), and a snapshot of it can be drawn
// by any canvas. "Run" makes ITERATIONS short-lived offscreen surfaces, each
// disposed right away, then checks what was alive before them: the shared
// context, a surface the app keeps, and a snapshot taken from that surface,
// which the canvas on the right draws. Web only.

const ITERATIONS = 30;
const SIZE = 200;
const RED = "255,0,0,255";

const isWeb = Platform.OS === "web" && typeof document !== "undefined";

// index.web.js puts the CanvasKit instance on globalThis.
declare const CanvasKit: CanvasKitType;

const sharedContext = () =>
  isWeb && typeof CanvasKit !== "undefined"
    ? peekSharedWebGLContext(CanvasKit)
    : null;

const topLeftPixel = async (image: SkImage) => {
  const pixels = await image.readPixels(0, 0, {
    width: 1,
    height: 1,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  return pixels ? Array.from(pixels).join(",") : "null";
};

const verdict = (pixel: string) =>
  pixel === RED ? "ok" : `BROKEN (read ${pixel}, expected ${RED})`;

export const WebOffscreen = () => {
  const [contextState, setContextState] = useState("unknown");
  const [report, setReport] = useState("not run");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SkImage | null>(null);

  // A lost context is what an eviction or a GPU reset looks like from the
  // outside.
  useEffect(() => {
    if (!isWeb) {
      return undefined;
    }
    const tick = () => {
      const shared = sharedContext();
      if (!shared) {
        setContextState("none");
      } else {
        setContextState(shared.gl.isContextLost() ? "LOST" : "ok");
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, []);

  // The snapshot on display is replaced by each run.
  useEffect(() => () => snapshot?.dispose(), [snapshot]);

  const run = () => {
    setError(null);
    setReport("running");
    try {
      // A surface the app keeps (a layer it paints into over time, say) and
      // a snapshot taken from it.
      const kept = Skia.Surface.MakeOffscreen(64, 64)!;
      kept.getCanvas().drawColor(Skia.Color("red"));
      kept.flush();
      const keptSnapshot = kept.makeImageSnapshot();

      const start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        const surface = Skia.Surface.MakeOffscreen(256, 256)!;
        surface.getCanvas().drawColor(Skia.Color(`hsl(${i * 12}, 70%, 50%)`));
        surface.flush();
        const snap = surface.makeImageSnapshot();
        snap.dispose();
        surface.dispose();
      }
      const elapsed = performance.now() - start;

      // Chrome evicts on a timer once the limit is exceeded.
      setTimeout(async () => {
        try {
          kept.getCanvas().drawColor(Skia.Color("red"));
          kept.flush();
          const redrawn = kept.makeImageSnapshot();
          const keptPixel = await topLeftPixel(redrawn);
          redrawn.dispose();
          const snapshotPixel = await topLeftPixel(keptSnapshot);
          setReport(
            `${ITERATIONS} surfaces in ${Math.round(elapsed)} ms` +
              ` · kept surface: ${verdict(keptPixel)}` +
              ` · snapshot: ${verdict(snapshotPixel)}`
          );
          // The canvas draws the snapshot; the surface is done with.
          setSnapshot(keptSnapshot);
          kept.dispose();
        } catch (e) {
          setError((e as Error).message);
        }
      }, 500);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Offscreen surfaces</Text>
      <Text style={styles.description}>
        Run makes {ITERATIONS} offscreen surfaces (MakeOffscreen, draw,
        makeImageSnapshot, dispose). Expected: the reference canvas keeps
        painting, the surface kept from before the run still reads back red, and
        the canvas on the right shows its snapshot. Chrome logs "Too many active
        WebGL contexts" for every context it evicts. Web only.
      </Text>
      <Text style={styles.status} testID="status">
        {`context: ${contextState} · ${report}` +
          (error ? ` · error: ${error}` : "")}
      </Text>
      <View style={styles.row}>
        <View testID="reference">
          <Canvas style={styles.canvas}>
            <Fill color="#5bc0be" />
          </Canvas>
        </View>
        <View testID="snapshot">
          <Canvas style={styles.canvas}>
            <Fill color="#1c2541" />
            {snapshot && (
              <Image
                image={snapshot}
                x={0}
                y={0}
                width={SIZE}
                height={SIZE}
                fit="fill"
              />
            )}
          </Canvas>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          testID="run"
          title={`Make ${ITERATIONS} offscreen surfaces`}
          onPress={run}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
  },
  description: {
    fontSize: 13,
    color: "#666",
  },
  status: {
    fontSize: 13,
    fontFamily: Platform.select({ web: "monospace", default: undefined }),
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  actions: {
    gap: 8,
    alignItems: "flex-start",
  },
  canvas: {
    width: SIZE,
    height: SIZE,
  },
});
