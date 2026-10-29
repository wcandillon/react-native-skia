import fs from "fs";
import os from "os";
import path from "path";

import { PNG } from "pngjs";

import type { SkImage } from "../skia/types";

import type * as Setup from "./setup";

const png = PNG.sync.write(new PNG({ width: 1, height: 1 }));
const image = {
  encodeToBytes: () => Promise.resolve(png),
} as unknown as SkImage;

// setup reads CI once, as it loads.
const loadCheckImage = (ci: string | undefined): typeof Setup.checkImage => {
  const previous = process.env.CI;
  if (ci === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = ci;
  }
  jest.resetModules();
  const { checkImage } = require("./setup") as typeof Setup;
  if (previous === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = previous;
  }
  return checkImage;
};

describe("checkImage", () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "check-image-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("fails a check without a reference on CI, keeping its image as a failed check's", async () => {
    const checkImage = loadCheckImage("true");
    const reference = path.join(directory, "missing.png");
    await expect(checkImage(image, reference)).rejects.toThrow(
      "has no reference image"
    );
    expect(fs.existsSync(reference)).toBe(false);
    expect(fs.existsSync(`${reference}.test.png`)).toBe(true);
  });

  it("writes the reference of a check without one outside CI", async () => {
    const checkImage = loadCheckImage(undefined);
    const reference = path.join(directory, "missing.png");
    expect(await checkImage(image, reference)).toBe(0);
    expect(fs.existsSync(reference)).toBe(true);
    expect(fs.existsSync(`${reference}.test.png`)).toBe(false);
  });

  it("compares against an existing reference on CI", async () => {
    const checkImage = loadCheckImage("true");
    const reference = path.join(directory, "present.png");
    fs.writeFileSync(reference, png);
    expect(await checkImage(image, reference)).toBe(0);
    expect(fs.existsSync(`${reference}.test.png`)).toBe(false);
  });
});
