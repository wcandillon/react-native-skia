import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * What an .mp4 file holds, read from its boxes (ISO/IEC 14496-12), enough to
 * check what a video export wrote without a decoder.
 */
export interface Mp4Track {
  /** "vide" or "soun". */
  handler: string;
  /** The sample entry: "avc1", "mp4a". */
  codec: string;
  width: number;
  height: number;
  sampleRate: number;
  channels: number;
  timescale: number;
  sampleCount: number;
  /** The decode duration of each sample, in the track's timescale. */
  sampleDeltas: number[];
  /**
   * When the track starts playing in the movie, in seconds: the empty edit
   * of its edit list, if any.
   */
  startTime: number;
  /**
   * The media its edit list skips, in seconds (the priming samples of an
   * AAC track).
   */
  skippedMedia: number;
  /** The length of the track's media, in seconds. */
  duration: number;
  /**
   * How long the track plays, in seconds: its edit list's segment (media
   * past it is not played), or its media less what is skipped.
   */
  presentedDuration: number;
}

const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts"]);

const fourcc = (data: Buffer, offset: number) =>
  data.toString("latin1", offset, offset + 4);

const readBoxes = (
  data: Buffer,
  start: number,
  end: number,
  visit: (type: string, body: Buffer) => void
) => {
  let offset = start;
  while (offset + 8 <= end) {
    let size = data.readUInt32BE(offset);
    const type = fourcc(data, offset + 4);
    let header = 8;
    if (size === 1) {
      size = Number(data.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) {
      throw new Error(`Malformed ${type} box at ${offset}`);
    }
    const body = data.subarray(offset + header, offset + size);
    visit(type, body);
    if (CONTAINERS.has(type)) {
      readBoxes(body, 0, body.length, visit);
    }
    offset += size;
  }
};

/** The tracks of an .mp4 file, in file order. */
export const readMp4 = (data: Buffer) => {
  const tracks: Mp4Track[] = [];
  let movieTimescale = 1;
  let track: Mp4Track | null = null;
  let editMediaTime = 0;
  let editStart = 0;
  let editSegment = -1;
  readBoxes(data, 0, data.length, (type, body) => {
    const version = body[0];
    switch (type) {
      case "mvhd":
        movieTimescale = body.readUInt32BE(version === 1 ? 20 : 12);
        break;
      case "trak":
        track = {
          handler: "",
          codec: "",
          width: 0,
          height: 0,
          sampleRate: 0,
          channels: 0,
          timescale: 1,
          sampleCount: 0,
          sampleDeltas: [],
          startTime: 0,
          skippedMedia: 0,
          duration: 0,
          presentedDuration: 0,
        };
        editMediaTime = 0;
        editStart = 0;
        editSegment = -1;
        tracks.push(track);
        break;
      case "elst": {
        // An empty edit first delays the track; the next one says where in
        // its media it starts (the priming samples an AAC track skips).
        const count = body.readUInt32BE(4);
        let offset = 8;
        for (let i = 0; i < count; i++) {
          const segment =
            version === 1
              ? Number(body.readBigUInt64BE(offset))
              : body.readUInt32BE(offset);
          const mediaTime =
            version === 1
              ? Number(body.readBigInt64BE(offset + 8))
              : body.readInt32BE(offset + 4);
          offset += version === 1 ? 20 : 12;
          if (mediaTime === -1) {
            editStart += segment / movieTimescale;
          } else {
            editMediaTime = mediaTime;
            editSegment = segment / movieTimescale;
            break;
          }
        }
        break;
      }
      case "mdhd":
        track!.timescale = body.readUInt32BE(version === 1 ? 20 : 12);
        track!.duration =
          (version === 1
            ? Number(body.readBigUInt64BE(24))
            : body.readUInt32BE(16)) / track!.timescale;
        track!.startTime = editStart;
        track!.skippedMedia = editMediaTime / track!.timescale;
        track!.presentedDuration =
          editSegment >= 0
            ? editSegment
            : track!.duration - track!.skippedMedia;
        break;
      case "hdlr":
        track!.handler = fourcc(body, 8);
        break;
      case "stsd": {
        // The first sample entry, after the full box header and the count.
        const entry = body.subarray(8);
        track!.codec = fourcc(entry, 4);
        if (track!.handler === "vide") {
          track!.width = entry.readUInt16BE(32);
          track!.height = entry.readUInt16BE(34);
        } else if (track!.handler === "soun") {
          track!.channels = entry.readUInt16BE(24);
          track!.sampleRate = entry.readUInt32BE(32) / 65536;
        }
        break;
      }
      case "stts": {
        const count = body.readUInt32BE(4);
        for (let i = 0; i < count; i++) {
          const samples = body.readUInt32BE(8 + i * 8);
          const delta = body.readUInt32BE(12 + i * 8);
          for (let j = 0; j < samples; j++) {
            track!.sampleDeltas.push(delta);
          }
        }
        break;
      }
      case "stsz":
        track!.sampleCount = body.readUInt32BE(8);
        break;
    }
  });
  return tracks;
};

// The package of an Android app, from a path in its private storage:
// /data/user/0/<package>/cache/... (or /data/data/<package>/...).
const androidPackageOf = (devicePath: string) => {
  const match = /^\/data\/(?:user\/\d+|data)\/([^/]+)\//.exec(devicePath);
  if (!match) {
    throw new Error(`Not in an app's private storage: ${devicePath}`);
  }
  return match[1];
};

/**
 * Copies a file of this machine to where the app reads it: the iOS
 * Simulator's files are this machine's, an Android app's private storage is
 * written through adb (run-as, which a debug build allows).
 */
export const pushDeviceFile = (
  local: string,
  devicePath: string,
  platform: string
) => {
  if (platform === "android") {
    execFileSync(
      "adb",
      [
        "shell",
        "run-as",
        androidPackageOf(devicePath),
        "sh",
        "-c",
        `'cat > ${devicePath}'`,
      ],
      { input: fs.readFileSync(local) }
    );
  } else {
    fs.copyFileSync(local, devicePath);
  }
};

/**
 * Copies a file the app wrote to this machine, to read it: the iOS
 * Simulator's files are this machine's already, an Android device's are
 * read from the app's private storage through adb (run-as, which a debug
 * build allows).
 */
export const pullDeviceFile = (devicePath: string, platform: string) => {
  const local = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "rnskia-e2e-")),
    path.basename(devicePath)
  );
  if (platform === "android") {
    const bytes = execFileSync(
      "adb",
      ["exec-out", "run-as", androidPackageOf(devicePath), "cat", devicePath],
      { maxBuffer: 256 * 1024 * 1024 }
    );
    fs.writeFileSync(local, bytes);
  } else {
    fs.copyFileSync(devicePath, local);
  }
  return local;
};

/** Whether ffmpeg is on this machine, to decode what was exported. */
export const hasFfmpeg = () => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/** The RGB of a pixel of the video at a time, decoded with ffmpeg. */
export const videoPixel = (
  file: string,
  time: number,
  x: number,
  y: number
) => {
  const raw = execFileSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-ss",
      String(time),
      "-i",
      file,
      "-frames:v",
      "1",
      "-vf",
      `format=rgb24,crop=1:1:${x}:${y}`,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ],
    { maxBuffer: 1024 }
  );
  return [raw[0], raw[1], raw[2]];
};

/** When the sound gets loud after a silence, in seconds, decoded with ffmpeg. */
export const soundOnsets = (file: string) => {
  const { stderr } = spawnSync(
    "ffmpeg",
    [
      "-i",
      file,
      "-vn",
      "-af",
      "silencedetect=n=-30dB:d=0.3",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" }
  );
  return Array.from(stderr.matchAll(/silence_end: ([0-9.]+)/g)).map((m) =>
    Number(m[1])
  );
};
