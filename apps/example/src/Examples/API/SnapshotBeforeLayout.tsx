import React, { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { Canvas, Circle, useCanvasRef } from "react-native-skia";

/**
 * Regression check for https://github.com/Shopify/react-native-skia/issues/4029
 *
 * Snapshots of a Canvas whose native view is not ready must reject with
 * "Failed to make snapshot from view." instead of aborting the process.
 *
 *  A) view does not exist: `display: "none"` parent (never mounted natively),
 *     or the snapshot is requested right after commit / after unmount.
 *     Without the fix: null dereference in makeImageSnapshotAsync.
 *  B) view mounted but not laid out yet: the view is registered in
 *     willMoveToSuperview, but its Metal context is only created in
 *     layoutSubviews, so the canvas size is -1 in between.
 *     Without the fix: MTLTextureDescriptor has width (18446744073709551615).
 *     The window is small, so this case is exercised in a remount loop.
 *  C) zero-size canvas.
 */

// Set to true to start the case-B loop automatically after mount.
const AUTO_START = false;

type Log = (m: string) => void;

const snapshot = (
  tag: string,
  ref: ReturnType<typeof useCanvasRef>,
  log: Log
) => {
  ref.current
    ?.makeImageSnapshotAsync()
    .then((img) => log(`[${tag}] resolved ${img.width()}x${img.height()}`))
    .catch((e) => log(`[${tag}] rejected: ${String(e)}`));
};

const FreshCanvas = ({ log }: { log: Log }) => {
  const ref = useCanvasRef();
  useEffect(() => {
    // One tick after commit: the native view has been added to its superview
    // (registered) but may not have gone through layoutSubviews yet.
    const t = setTimeout(() => snapshot("fresh", ref, log), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Canvas ref={ref} style={styles.fresh}>
      <Circle cx={100} cy={100} r={80} color="purple" />
    </Canvas>
  );
};

export const SnapshotBeforeLayout = () => {
  const refHidden = useCanvasRef();
  const refZero = useCanvasRef();
  const refVisible = useCanvasRef();
  const [logs, setLogs] = useState<string[]>([]);
  const [counts, setCounts] = useState({ resolved: 0, rejected: 0 });
  const [stress, setStress] = useState(AUTO_START);
  const [mountKey, setMountKey] = useState(0);
  const log: Log = (m) => {
    console.log(m);
    setLogs((prev) => [...prev.slice(-30), m]);
    const key = m.includes("rejected") ? "rejected" : "resolved";
    setCounts((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  };

  useEffect(() => {
    if (!stress) {
      return;
    }
    const iv = setInterval(() => setMountKey((k) => k + 1), 40);
    return () => clearInterval(iv);
  }, [stress]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Snapshot of a canvas that is not ready</Text>
      <Text>Every button must log a rejection, never crash.</Text>
      <Text>
        resolved: {counts.resolved} / rejected: {counts.rejected}
      </Text>

      {/* control — kept first in the DOM: the web smoke test asserts the
          first canvas on the page is visible */}
      <Canvas ref={refVisible} style={styles.visible}>
        <Circle cx={60} cy={60} r={50} color="teal" />
      </Canvas>

      {/* C) zero size */}
      <Canvas ref={refZero} style={styles.zero}>
        <Circle cx={0} cy={0} r={10} color="orange" />
      </Canvas>

      {/* B) freshly mounted, snapshot before first layout */}
      {stress && <FreshCanvas key={mountKey} log={log} />}

      {/* A) never mounted natively */}
      <View style={styles.hidden}>
        <Canvas ref={refHidden} style={styles.hiddenCanvas}>
          <Circle cx={150} cy={150} r={100} color="magenta" />
        </Canvas>
      </View>

      <Button
        title={`B) remount + snapshot loop: ${
          stress ? "ON" : "OFF"
        } (${mountKey})`}
        onPress={() => setStress((v) => !v)}
      />
      <Button
        title="A) hidden canvas"
        onPress={() => snapshot("hidden", refHidden, log)}
      />
      <Button
        title="C) zero-size canvas"
        onPress={() => snapshot("zero", refZero, log)}
      />
      <Button
        title="visible canvas (resolves)"
        onPress={() => snapshot("visible", refVisible, log)}
      />
      {logs.map((m, i) => (
        <Text key={i} style={styles.log}>
          {m}
        </Text>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12, padding: 16 },
  title: { fontWeight: "bold" },
  hidden: { display: "none" },
  hiddenCanvas: { width: 300, height: 300 },
  zero: { width: 0, height: 0 },
  fresh: { width: 200, height: 200 },
  visible: { width: 120, height: 120 },
  log: { fontSize: 11 },
});
