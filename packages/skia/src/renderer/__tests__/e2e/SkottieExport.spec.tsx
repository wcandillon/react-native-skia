import fs from "fs";

import { itRunsE2eOnly } from "../../../__tests__/setup";
import { resolveFile, surface } from "../setup";

import {
  hasFfmpeg,
  pullDeviceFile,
  readMp4,
  soundOnsets,
  videoPixel,
} from "./setup/Mp4";

const legoLoaderJSON = require("./setup/skottie/lego_loader.json");
const exportCheckJSON = require("./setup/skottie/export-check.json");

const legoLoader = JSON.stringify(legoLoaderJSON);
// 320x320, 10 fps, 2 s: red for the first second, green for the second,
// with a white square in the top left corner (a flipped frame moves it).
const exportCheck = JSON.stringify(exportCheckJSON);
// 3 s of silence with a beep at 1 s, as AAC and as MP3.
const sound = (extension: string) =>
  resolveFile(
    `renderer/__tests__/e2e/setup/skottie/export-check.${extension}`
  ).toString("base64");

const ffmpeg = hasFfmpeg();
if (!ffmpeg && process.env.E2E === "true") {
  console.warn(
    "ffmpeg is not installed: the frames and the sound of the exported videos are not decoded and checked, only the structure of the files."
  );
}

const expectColor = (actual: number[], expected: number[]) => {
  actual.forEach((channel, i) =>
    expect(Math.abs(channel - expected[i])).toBeLessThan(40)
  );
};

describe("Skottie video export", () => {
  itRunsE2eOnly("exports every frame of the animation", async () => {
    const outcome = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.legoLoader)!;
        const progress: number[] = [];
        return Skia.Skottie.exportVideo(animation, {
          path: "e2e-skottie-export.mp4",
          width: 320,
          height: 240,
          onProgress: (frames) => progress.push(frames),
        }).then(
          (result) => ({
            frames: result.frames,
            duration: result.duration,
            fps: result.fps,
            expected: Math.round(animation.duration() * animation.fps()),
            progress,
            error: "",
          }),
          // Errors do not survive the trip back from the device.
          (e) => ({
            frames: 0,
            duration: 0,
            fps: 0,
            expected: 0,
            progress,
            error: `${e.code}: ${e.message}`,
          })
        );
      },
      { legoLoader }
    );
    expect(outcome.error).toBe("");
    expect(outcome.frames).toBe(outcome.expected);
    expect(outcome.duration).toBeCloseTo(outcome.frames / outcome.fps, 5);
    expect(outcome.progress[outcome.progress.length - 1]).toBe(outcome.frames);
  });

  itRunsE2eOnly(
    "does not queue up progress behind a slow onProgress",
    async () => {
      const outcome = await surface.eval(
        (Skia, ctx) => {
          const animation = Skia.Skottie.Make(ctx.legoLoader)!;
          const reports: number[] = [];
          const start = performance.now();
          return Skia.Skottie.exportVideo(animation, {
            path: "e2e-skottie-export-slow-progress.mp4",
            width: 320,
            height: 240,
            onProgress: (frames) => {
              reports.push(frames);
              // A re-render slower than the export.
              const until = performance.now() + 100;
              while (performance.now() < until) {
                // busy
              }
            },
          }).then(
            (result) => ({
              frames: result.frames,
              reports,
              elapsed: performance.now() - start,
              error: "",
            }),
            (e) => ({
              frames: 0,
              reports,
              elapsed: 0,
              error: `${e.code}: ${e.message}`,
            })
          );
        },
        { legoLoader }
      );
      expect(outcome.error).toBe("");
      // The last report is the whole animation, the counts never go down, and
      // there is at most one report per 100 ms the handler takes (plus the one
      // that may be queued when the export ends).
      expect(outcome.reports[outcome.reports.length - 1]).toBe(outcome.frames);
      outcome.reports.forEach((frames, i) => {
        if (i > 0) {
          expect(frames).toBeGreaterThanOrEqual(outcome.reports[i - 1]);
        }
      });
      expect(outcome.reports.length).toBeLessThanOrEqual(
        Math.ceil(outcome.elapsed / 100) + 1
      );
    }
  );

  itRunsE2eOnly("exports twice in a row", async () => {
    const outcome = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.legoLoader)!;
        const run = () =>
          Skia.Skottie.exportVideo(animation, {
            path: "e2e-skottie-export-twice.mp4",
            width: 160,
            height: 160,
            fps: 10,
          });
        return run()
          .then(run)
          .then(
            (result) => ({ frames: result.frames, error: "" }),
            (e) => ({ frames: 0, error: `${e.code}: ${e.message}` })
          );
      },
      { legoLoader }
    );
    expect(outcome).toEqual({
      frames: expect.any(Number),
      error: "",
    });
  });

  itRunsE2eOnly("writes to a file:// URL with escapes", async () => {
    const outcome = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.legoLoader)!;
        const options = { width: 160, height: 160, fps: 5 };
        // The cache directory, from where a relative path is written.
        return Skia.Skottie.exportVideo(animation, {
          ...options,
          path: "e2e-skottie-export-url.mp4",
        })
          .then((first) => {
            const directory = first.path.slice(0, first.path.lastIndexOf("/"));
            return Skia.Skottie.exportVideo(animation, {
              ...options,
              path: `file://${directory}/e2e%20skottie%20export.mp4`,
            });
          })
          .then(
            (result) => ({ path: result.path, error: "" }),
            (e) => ({ path: "", error: `${e.code}: ${e.message}` })
          );
      },
      { legoLoader }
    );
    expect(outcome.error).toBe("");
    expect(outcome.path.endsWith("/e2e skottie export.mp4")).toBe(true);
  });

  itRunsE2eOnly("cancels an export while it starts", async () => {
    const outcome = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.exportCheck)!;
        const controller = new AbortController();
        const exported = Skia.Skottie.exportVideo(animation, {
          path: "e2e-skottie-export-cancelled-early.mp4",
          width: 320,
          height: 320,
          audio: { data: Skia.Data.fromBase64(ctx.sound) },
          signal: controller.signal,
        });
        // While the sound is read and the encoder set up.
        controller.abort();
        return exported.then(
          () => ({ code: "", name: "" }),
          (e) => ({ code: String(e.code), name: String(e.name) })
        );
      },
      { exportCheck, sound: sound("m4a") }
    );
    expect(outcome).toEqual({ code: "cancelled", name: "AbortError" });
  });

  itRunsE2eOnly("cancels an export through its signal", async () => {
    const outcome = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.legoLoader)!;
        const controller = new AbortController();
        return Skia.Skottie.exportVideo(animation, {
          path: "e2e-skottie-export-cancelled.mp4",
          width: 320,
          height: 320,
          signal: controller.signal,
          onProgress: (frames) => {
            if (frames >= 5) {
              controller.abort();
            }
          },
        }).then(
          () => ({ code: "", name: "" }),
          (e) => ({ code: String(e.code), name: String(e.name) })
        );
      },
      { legoLoader }
    );
    expect(outcome).toEqual({
      code: "cancelled",
      name: "AbortError",
    });
  });

  itRunsE2eOnly("rejects options it cannot encode", async () => {
    const outcomes = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.legoLoader)!;
        const attempt = (options: Record<string, unknown>) =>
          Skia.Skottie.exportVideo(animation, {
            path: "e2e-skottie-export-invalid.mp4",
            width: 320,
            height: 320,
            ...options,
          }).then(
            () => "resolved",
            (e) => e.code
          );
        const aborted = new AbortController();
        aborted.abort();
        return Promise.all([
          attempt({ width: 321 }),
          attempt({ width: Infinity }),
          attempt({ height: 0 }),
          attempt({ fps: -1 }),
          attempt({ path: "/no/such/directory/out.mp4" }),
          attempt({ audio: { path: "/no/such/sound.m4a" } }),
          attempt({ signal: aborted.signal }),
        ]);
      },
      { legoLoader }
    );
    expect(outcomes).toEqual([
      "unsupported",
      "unsupported",
      "unsupported",
      "unsupported",
      "write-failed",
      "audio-failed",
      "cancelled",
    ]);
  });

  for (const extension of ["m4a", "mp3"]) {
    itRunsE2eOnly(
      `writes the frames and the ${extension} sound it is given`,
      async () => {
        const result = await surface.eval(
          (Skia, ctx) => {
            const animation = Skia.Skottie.Make(ctx.exportCheck)!;
            return Skia.Skottie.exportVideo(animation, {
              path: `e2e-skottie-export-${ctx.extension}.mp4`,
              width: 320,
              height: 320,
              audio: { data: Skia.Data.fromBase64(ctx.sound) },
            }).then(
              (r) => ({ path: r.path, frames: r.frames, error: "" }),
              (e) => ({ path: "", frames: 0, error: `${e.code}: ${e.message}` })
            );
          },
          { exportCheck, extension, sound: sound(extension) }
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
        expect(video.syncSampleCount).toBeGreaterThanOrEqual(1);

        expect(audio).toMatchObject({
          handler: "soun",
          codec: "mp4a",
          channels: 2,
          sampleRate: 44100,
          startTime: 0,
        });
        // Cut to the video's length, to within an AAC frame or two.
        expect(Math.abs(audio.duration - audio.skippedMedia - 2)).toBeLessThan(
          0.05
        );

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

  itRunsE2eOnly(
    "renders the properties set on the animation before the export",
    async () => {
      const result = await surface.eval(
        (Skia, ctx) => {
          const animation = Skia.Skottie.Make(ctx.exportCheck)!;
          // The square, white in the JSON, made blue; the background left as
          // it is.
          const keys = animation
            .getColorProps()
            .map(({ key }) => key)
            .filter((key) => key.includes("Square"));
          keys.forEach((key) => animation.setColor(key, Skia.Color("blue")));
          return Skia.Skottie.exportVideo(animation, {
            path: "e2e-skottie-export-edited.mp4",
            width: 320,
            height: 320,
          }).then(
            (r) => ({ path: r.path, keys, error: "" }),
            (e) => ({ path: "", keys, error: `${e.code}: ${e.message}` })
          );
        },
        { exportCheck }
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
