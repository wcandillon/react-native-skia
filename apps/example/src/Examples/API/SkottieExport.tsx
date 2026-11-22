import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Button,
  Platform,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type {
  SkSkottieAnimation,
  SkottieVideoExportResult,
} from "react-native-skia";
import {
  Canvas,
  Group,
  Skia,
  Skottie,
  useClock,
  useData,
} from "react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import card from "./skottie_export.json";

const json = JSON.stringify(card);
const WIDTH = 1080;
const HEIGHT = 1920;

type Status =
  | { state: "idle" }
  | { state: "exporting"; frames: number; totalFrames: number }
  | { state: "done"; result: SkottieVideoExportResult; ms: number }
  | { state: "failed"; code: string; message: string };

const Preview = ({
  animation,
  height,
}: {
  animation: SkSkottieAnimation;
  height: number;
}) => {
  const clock = useClock();
  const frame = useDerivedValue(() => {
    const fps = animation.fps();
    return (
      Math.floor((clock.value / 1000) * fps) % (animation.duration() * fps)
    );
  });
  const scale = height / HEIGHT;
  return (
    <Canvas style={{ width: (height * WIDTH) / HEIGHT, height }}>
      <Group transform={[{ scale }]}>
        <Skottie animation={animation} frame={frame} />
      </Group>
    </Canvas>
  );
};

export const SkottieExport = () => {
  const photo = useData(require("../../assets/skottie_export_photo.jpg"));
  const logo = useData(require("../../assets/discrete.png"));
  const font = useData(require("../../assets/SF-Pro-Display-Bold.otf"));
  const sound = useData(require("../../assets/skottie_export_sound.m4a"));
  const [withSound, setWithSound] = useState(true);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const abort = useRef<AbortController | null>(null);
  // The preview fills the space above the controls, at the video's ratio.
  const [area, setArea] = useState({ width: 0, height: 0 });
  const previewHeight = Math.min(area.height, (area.width * HEIGHT) / WIDTH);

  const animation = useMemo(() => {
    if (!photo || !logo || !font) {
      return null;
    }
    // A share card: a 3D reveal, blurred lights, a masked photo and text.
    return Skia.Skottie.Make(json, {
      "photo.jpg": photo,
      "logo.png": logo,
      "SFProBold": font,
    });
  }, [photo, logo, font]);

  const run = useCallback(async () => {
    if (!animation || !sound) {
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    const start = performance.now();
    setStatus({ state: "exporting", frames: 0, totalFrames: 0 });
    try {
      const result = await Skia.Skottie.exportVideo(animation, {
        // Relative: written in the app's cache directory.
        path: "skottie-export.mp4",
        width: WIDTH,
        height: HEIGHT,
        audio: withSound ? { data: sound } : undefined,
        signal: controller.signal,
        onProgress: (frames, totalFrames) =>
          setStatus({ state: "exporting", frames, totalFrames }),
      });
      const ms = performance.now() - start;
      console.log(
        `[SkottieExport] ${result.frames} frames ${result.width}x${
          result.height
        } in ${ms.toFixed(0)} ms${withSound ? " with sound" : ""}: ${
          result.path
        }`
      );
      setStatus({ state: "done", result, ms });
    } catch (e) {
      const error = e as Error & { code?: string };
      console.log(
        `[SkottieExport] failed after ${(performance.now() - start).toFixed(
          0
        )} ms: ${error.code} ${error.message}`
      );
      setStatus({
        state: "failed",
        code: error.code ?? "unknown",
        message: error.message,
      });
    } finally {
      abort.current = null;
    }
  }, [animation, sound, withSound]);

  if (!animation) {
    return null;
  }
  return (
    <View style={styles.container}>
      <View
        style={styles.previewArea}
        onLayout={({ nativeEvent: { layout } }) =>
          setArea({ width: layout.width, height: layout.height })
        }
      >
        {previewHeight > 0 && (
          <Preview animation={animation} height={previewHeight} />
        )}
      </View>
      <View style={styles.row}>
        <Text>With sound</Text>
        <Switch value={withSound} onValueChange={setWithSound} />
      </View>
      <View style={styles.row}>
        <Button
          title={`Export ${WIDTH}×${HEIGHT} MP4`}
          onPress={run}
          disabled={status.state === "exporting"}
          testID="export"
        />
        <Button
          title="Cancel"
          onPress={() => abort.current?.abort()}
          disabled={status.state !== "exporting"}
          testID="cancel"
        />
      </View>
      {/* A fixed height, so that the preview doesn't move with the status. */}
      <View style={styles.footer}>
        <Text testID="status" style={styles.status}>
          {status.state === "exporting" &&
            `Exporting… ${status.frames}/${status.totalFrames}`}
          {status.state === "done" &&
            `${status.result.frames} frames, ${status.result.duration.toFixed(
              2
            )} s, in ${status.ms.toFixed(0)} ms\n${status.result.path}`}
          {status.state === "failed" && `${status.code}: ${status.message}`}
        </Text>
        {status.state === "done" && (
          <Button
            title="Open the video"
            onPress={() => {
              const url = `file://${status.result.path}`;
              if (Platform.OS === "ios") {
                Share.share({ url });
              } else {
                Share.share({ message: status.result.path });
              }
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  previewArea: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footer: {
    height: 110,
    alignItems: "center",
    gap: 8,
  },
  status: {
    textAlign: "center",
  },
});
