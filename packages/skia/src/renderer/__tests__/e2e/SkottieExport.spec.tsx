import fs from "fs";
import path from "path";

import { itRunsE2eOnly } from "../../../__tests__/setup";
import type { Skia, SkSkottieAnimation } from "../../../skia/types";
import { surface } from "../setup";

import {
  hasFfmpeg,
  pullDeviceFile,
  pushDeviceFile,
  readMp4,
  soundOnsets,
  videoPixel,
} from "./setup/Mp4";

// A Skottie animation exported to an .mp4 file through react-native-webgpu's
// createVideoWriter: each frame is drawn by Skia into a buffer of the
// encoder, imported into the shared device. The example app installs
// react-native-webgpu, whose RNWebGPU global is available to code evaluated on
// the device.
interface TestNativeBuffer {
  release(): void;
}
interface TestGPUTexture {
  destroy(): void;
}
interface TestSharedTextureMemory {
  createTexture(): TestGPUTexture;
  beginAccess(texture: TestGPUTexture, initialized: boolean): void;
  endAccess(texture: TestGPUTexture): unknown;
  destroy(): void;
}
interface TestGPUDevice {
  importSharedTextureMemory(descriptor: {
    source: TestNativeBuffer;
  }): TestSharedTextureMemory;
}
interface TestVideoWriter {
  readonly path: string;
  dequeueBuffer(): Promise<TestNativeBuffer>;
  append(buffer: TestNativeBuffer, done: unknown, timestamp: number): void;
  finish(): Promise<void>;
  cancel(): Promise<void>;
}
declare const RNWebGPU: {
  importDevice: (pointer: bigint) => TestGPUDevice;
  createVideoWriter: (
    path: string,
    options: Record<string, unknown>
  ) => TestVideoWriter;
};

interface ExportOptions {
  path: string;
  width: number;
  height: number;
  fps?: number;
  audio?: string;
}

// Runs on the device: the frame loop an app writes, as shown in the docs.
const exportSkottie = async (
  Skia: Skia,
  animation: SkSkottieAnimation,
  options: ExportOptions
) => {
  const device = RNWebGPU.importDevice(Skia.getNativeDevice());
  const fps = options.fps ?? animation.fps();
  const frames = Math.round(animation.duration() * fps);
  const writer = RNWebGPU.createVideoWriter(options.path, {
    width: options.width,
    height: options.height,
    frameRate: fps,
    device,
    audio: options.audio,
  });
  const rect = Skia.XYWHRect(0, 0, options.width, options.height);
  try {
    for (let i = 0; i < frames; i++) {
      const buffer = await writer.dequeueBuffer();
      const memory = device.importSharedTextureMemory({ source: buffer });
      const texture = memory.createTexture();
      memory.beginAccess(texture, false);
      const target = Skia.Surface.MakeFromGPUTexture(texture as never);
      const canvas = target.getCanvas();
      canvas.clear(Skia.Color("transparent"));
      animation.seekFrame((i / fps) * animation.fps());
      animation.render(canvas, rect);
      target.flush();
      writer.append(buffer, memory.endAccess(texture), i / fps);
      target.dispose();
      texture.destroy();
      memory.destroy();
    }
    await writer.finish();
  } catch (e) {
    await writer.cancel();
    throw e;
  }
  return { path: writer.path, frames };
};

const legoLoader = JSON.stringify(require("./setup/skottie/lego_loader.json"));
// 320x320, 10 fps, 2 s: red for the first second, green for the second,
// with a white square in the top left corner (a flipped frame moves it).
const exportCheck = JSON.stringify(
  require("./setup/skottie/export-check.json")
);

const ffmpeg = hasFfmpeg();

const expectColor = (actual: number[], expected: number[]) => {
  actual.forEach((channel, i) =>
    expect(Math.abs(channel - expected[i])).toBeLessThan(40)
  );
};

// Copies a sound file of the fixtures into the directory the app writes to.
const pushSound = (
  extension: string,
  directory: string,
  name = "export-check"
) => {
  const destination = `${directory}/e2e-${name}.${extension}`;
  pushDeviceFile(
    path.join(__dirname, `setup/skottie/${name}.${extension}`),
    destination,
    global.testOS
  );
  return destination;
};

// Where the app writes: the directory of a writer opened on a relative path.
// Asked once.
let directory: Promise<string> | undefined;
const appDirectory = () =>
  (directory ??= surface.eval((Skia) => {
    const writer = RNWebGPU.createVideoWriter("e2e-probe.mp4", {
      width: 16,
      height: 16,
      frameRate: 1,
      device: RNWebGPU.importDevice(Skia.getNativeDevice()),
    });
    // Nothing written: the probe's own path is all it is for.
    writer.cancel();
    return writer.path.slice(0, writer.path.lastIndexOf("/"));
  }));

describe("Skottie video export through react-native-webgpu", () => {
  itRunsE2eOnly("exports every frame of the animation", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const run = eval(`(${ctx.exportSkottie})`);
        const animation = Skia.Skottie.Make(ctx.legoLoader)!;
        const start = Date.now();
        return run(Skia, animation, {
          path: "e2e-skottie-export.mp4",
          width: 320,
          height: 240,
        }).then(
          (r: { path: string; frames: number }) => ({
            ...r,
            expected: Math.round(animation.duration() * animation.fps()),
            ms: Date.now() - start,
            error: "",
          }),
          (e: Error & { code?: string }) => ({
            path: "",
            frames: 0,
            expected: 0,
            ms: 0,
            error: `${e.code}: ${e.message}`,
          })
        );
      },
      { legoLoader, exportSkottie: exportSkottie.toString() }
    );
    expect(result.error).toBe("");
    expect(result.frames).toBe(result.expected);
    const file = pullDeviceFile(result.path, global.testOS);
    const [video, ...others] = readMp4(fs.readFileSync(file));
    expect(others).toEqual([]);
    expect(video).toMatchObject({
      handler: "vide",
      codec: "avc1",
      width: 320,
      height: 240,
      sampleCount: result.expected,
    });
    console.log(
      `[SkottieExport] ${result.frames} frames 320x240 in ${result.ms} ms`
    );
  });

  itRunsE2eOnly("keeps a fractional frame rate", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const run = eval(`(${ctx.exportSkottie})`);
        const animation = Skia.Skottie.Make(ctx.legoLoader)!;
        return run(Skia, animation, {
          path: "e2e-skottie-export-2997.mp4",
          width: 160,
          height: 160,
          fps: 30000 / 1001,
        }).then(
          (r: { path: string; frames: number }) => ({ ...r, error: "" }),
          (e: Error & { code?: string }) => ({
            path: "",
            frames: 0,
            error: `${e.code}: ${e.message}`,
          })
        );
      },
      { legoLoader, exportSkottie: exportSkottie.toString() }
    );
    expect(result.error).toBe("");
    const file = pullDeviceFile(result.path, global.testOS);
    const [video] = readMp4(fs.readFileSync(file));
    expect(video.sampleCount).toBe(result.frames);
    // Every frame 1001 / 30000 s long, give or take the clock's rounding.
    video.sampleDeltas.slice(0, -1).forEach((delta) => {
      expect(Math.abs(delta / video.timescale - 1001 / 30000)).toBeLessThan(
        0.0005
      );
    });
  });

  for (const extension of ["m4a", "mp3"]) {
    itRunsE2eOnly(
      `writes the frames and the ${extension} sound it is given`,
      async () => {
        const sound = pushSound(extension, await appDirectory());
        const result = await surface.eval(
          (Skia, ctx) => {
            const run = eval(`(${ctx.exportSkottie})`);
            const animation = Skia.Skottie.Make(ctx.exportCheck)!;
            return run(Skia, animation, {
              path: `e2e-skottie-export-${ctx.extension}.mp4`,
              width: 320,
              height: 320,
              audio: ctx.sound,
            }).then(
              (r: { path: string; frames: number }) => ({ ...r, error: "" }),
              (e: Error & { code?: string }) => ({
                path: "",
                frames: 0,
                error: `${e.code}: ${e.message}`,
              })
            );
          },
          {
            exportCheck,
            extension,
            sound,
            exportSkottie: exportSkottie.toString(),
          }
        );
        expect(result.error).toBe("");
        expect(result.frames).toBe(20);
        const file = pullDeviceFile(result.path, global.testOS);
        const [video, audio, ...others] = readMp4(fs.readFileSync(file));
        expect(others).toEqual([]);
        expect(video).toMatchObject({
          handler: "vide",
          codec: "avc1",
          width: 320,
          height: 320,
          sampleCount: 20,
          startTime: 0,
          duration: 2,
        });
        // Every frame 1 / fps long, from the first.
        expect(new Set(video.sampleDeltas)).toEqual(
          new Set([video.timescale / 10])
        );
        expect(audio).toMatchObject({
          handler: "soun",
          codec: "mp4a",
          channels: 2,
          sampleRate: 44100,
          startTime: 0,
        });
        // Cut to the video's length, to within an AAC frame or two.
        // Cut where the video ends, to within half an AAC frame (Android
        // keeps a frame if most of it plays before the end).
        expect(Math.abs(audio.presentedDuration - 2)).toBeLessThan(0.012);
        if (!ffmpeg) {
          return;
        }
        // Red in the first second, green in the second, the square top left.
        expectColor(videoPixel(file, 0.5, 200, 200), [255, 0, 0]);
        expectColor(videoPixel(file, 1.5, 200, 200), [0, 255, 0]);
        expectColor(videoPixel(file, 0.5, 40, 40), [255, 255, 255]);
        expectColor(videoPixel(file, 1.5, 280, 280), [0, 255, 0]);
        // The beep where it is in the sound file: at 1 s (silencedetect
        // reports its end of silence about 20 ms in), and nothing before.
        const onsets = soundOnsets(file);
        expect(onsets.length).toBeGreaterThanOrEqual(1);
        expect(Math.abs(onsets[0] - 1.02)).toBeLessThan(0.03);
      }
    );
  }

  // AVAssetWriter interleaves the tracks and holds the video back until the
  // sound is ahead of it by about half a second: with frames the encoder
  // takes a while over, the video waited for sound the writer only wrote up
  // to the frame, and timed out a few seconds in. 5 s of 1080x1920 at 30 fps
  // over 8 s of 48 kHz AAC, cut to the video.
  itRunsE2eOnly(
    "interleaves a long sound with large frames",
    async () => {
      const sound = pushSound("m4a", await appDirectory(), "sine-8s");
      const result = await surface.eval(
        (Skia, ctx) => {
          const run = eval(`(${ctx.exportSkottie})`);
          const animation = Skia.Skottie.Make(ctx.legoLoader)!;
          const start = Date.now();
          return run(Skia, animation, {
            path: "e2e-skottie-export-large.mp4",
            width: 1080,
            height: 1920,
            fps: 30,
            audio: ctx.sound,
          }).then(
            (r: { path: string; frames: number }) => ({
              ...r,
              ms: Date.now() - start,
              error: "",
            }),
            (e: Error & { code?: string }) => ({
              path: "",
              frames: 0,
              ms: Date.now() - start,
              error: `${e.code}: ${e.message}`,
            })
          );
        },
        { legoLoader, sound, exportSkottie: exportSkottie.toString() }
      );
      console.log(
        `[SkottieExport] ${result.frames} frames 1080x1920 with sound in ${result.ms} ms`
      );
      expect(result.error).toBe("");
      const file = pullDeviceFile(result.path, global.testOS);
      const [video, audio] = readMp4(fs.readFileSync(file));
      expect(video.sampleCount).toBe(result.frames);
      const seconds = result.frames / 30;
      expect(Math.abs(video.duration - seconds)).toBeLessThan(0.001);
      // The sound written ahead of the video is cut where the video ends.
      expect(Math.abs(audio.presentedDuration - seconds)).toBeLessThan(0.012);
    },
    60000
  );

  itRunsE2eOnly(
    "renders the properties set on the animation before the export",
    async () => {
      const result = await surface.eval(
        (Skia, ctx) => {
          const run = eval(`(${ctx.exportSkottie})`);
          const animation = Skia.Skottie.Make(ctx.exportCheck)!;
          // The square, white in the JSON, made blue.
          const keys = animation
            .getColorProps()
            .map(({ key }) => key)
            .filter((key) => key.includes("Square"));
          keys.forEach((key) => animation.setColor(key, Skia.Color("blue")));
          return run(Skia, animation, {
            path: "e2e-skottie-export-edited.mp4",
            width: 320,
            height: 320,
          }).then(
            (r: { path: string }) => ({ path: r.path, keys, error: "" }),
            (e: Error & { code?: string }) => ({
              path: "",
              keys,
              error: `${e.code}: ${e.message}`,
            })
          );
        },
        { exportCheck, exportSkottie: exportSkottie.toString() }
      );
      expect(result.error).toBe("");
      expect(result.keys.length).toBeGreaterThan(0);
      if (!ffmpeg) {
        return;
      }
      const file = pullDeviceFile(result.path, global.testOS);
      expectColor(videoPixel(file, 0.5, 40, 40), [0, 0, 255]);
      expectColor(videoPixel(file, 0.5, 200, 200), [255, 0, 0]);
    }
  );
});
