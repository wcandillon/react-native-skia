/* eslint-disable max-len */
import path from "path";
import fs from "fs";

import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { diff } from "jest-diff";

import type { SkSurface, SkImage } from "../skia/types";

export const E2E = process.env.E2E === "true";
export const CI = process.env.CI === "true";
export const itFailsE2e = E2E ? it.failing : it;
export const itRunsE2eOnly = E2E ? it : it.skip;
export const itRunsNodeOnly = E2E ? it.skip : it;
export const itRunsCIAndNodeOnly = CI || !E2E ? it : it.skip;

export const docPath = (relPath: string) =>
  path.resolve(process.cwd(), `../../apps/docs/static/img/${relPath}`);

export const processResult = (
  surface: SkSurface,
  relPath: string,
  overwrite = false
) => {
  surface.flush();
  const image = surface.makeImageSnapshot();
  surface.getCanvas().clear(Float32Array.of(0, 0, 0, 0));
  const result = checkImage(image, relPath, { overwrite });
  image.dispose();
  return result;
};

interface CheckImageOptions {
  maxPixelDiff?: number;
  threshold?: number;
  overwrite?: boolean;
  mute?: boolean;
  shouldFail?: boolean;
}

// On Github Action, the image decoding is slightly different
// all tests that show the oslo.jpg have small differences but look ok
const defaultCheckImageOptions = {
  maxPixelDiff: 200,
  threshold: 0.1,
  overwrite: false,
  mute: false,
  shouldFail: false,
};

export const checkImage = (
  image: SkImage,
  relPath: string,
  opts?: CheckImageOptions
) => {
  const options = { ...defaultCheckImageOptions, ...opts };
  const { overwrite, threshold, mute, maxPixelDiff, shouldFail } = options;
  const png = image.encodeToBytes();
  const p = path.resolve(__dirname, relPath);
  if (fs.existsSync(p) && !overwrite) {
    const ref = fs.readFileSync(p);
    const baseline = PNG.sync.read(ref);
    const toTest = PNG.sync.read(Buffer.from(image.encodeToBytes()));
    const diffImage = new PNG({
      width: baseline.width,
      height: baseline.height,
    });
    if (baseline.width !== toTest.width || baseline.height !== toTest.height) {
      throw new Error(
        `Image sizes don't match: ${baseline.width}x${baseline.height} vs ${toTest.width}x${toTest.height}`
      );
    }
    const diffPixelsCount = pixelmatch(
      baseline.data,
      toTest.data,
      diffImage.data,
      baseline.width,
      baseline.height,
      { threshold }
    );
    if (!mute) {
      if (diffPixelsCount > maxPixelDiff && !shouldFail) {
        console.log(`${p} didn't match`);
        fs.writeFileSync(`${p}.test.png`, PNG.sync.write(toTest));
        //fs.writeFileSync(`${p}-diff-test.png`, PNG.sync.write(diffImage));
      }
      if (shouldFail) {
        expect(diffPixelsCount).not.toBeLessThanOrEqual(maxPixelDiff);
      } else {
        expect(diffPixelsCount).toBeLessThanOrEqual(maxPixelDiff);
      }
    }
    return diffPixelsCount;
  } else {
    fs.writeFileSync(p, png);
  }
  return 0;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /**
       * Checks if values are approximately equal within the given tolerance.
       * Works with:
       * - Single numbers
       * - Arrays of numbers
       * - Float32Arrays
       * - SVG path strings (compares numeric values with tolerance)
       *
       * @param expected - The expected value to compare against
       * @param tolerance - The maximum allowed difference between elements (default: 0.01)
       */
      toBeApproximatelyEqual(
        expected: number | number[] | Float32Array | string,
        tolerance?: number
      ): R;
    }
  }
}

expect.extend({
  toBeApproximatelyEqual(_received, _argument, tolerance = 0.01) {
    // Handle SVG path strings
    if (typeof _received === "string" && typeof _argument === "string") {
      // Parse SVG path strings to extract numerical values
      const parsePathString = (pathStr: string): number[] => {
        // Extract all numeric values (including decimals) from the path string
        const numbers = pathStr.match(/-?\d+(?:\.\d+)?/g) || [];
        return numbers.map(Number);
      };

      const receivedPoints = parsePathString(_received);
      const argumentPoints = parsePathString(_argument);

      if (receivedPoints.length !== argumentPoints.length) {
        return {
          pass: false,
          message: () =>
            `SVG paths have different number of points: ${receivedPoints.length} vs ${argumentPoints.length}`,
        };
      }

      for (let i = 0; i < receivedPoints.length; i++) {
        if (
          isNaN(receivedPoints[i]) ||
          isNaN(argumentPoints[i]) ||
          Math.abs(receivedPoints[i] - argumentPoints[i]) > tolerance
        ) {
          return {
            pass: false,
            message: () =>
              `SVG path points differ more than ${tolerance} at position ${i}: ${receivedPoints[i]} vs ${argumentPoints[i]}`,
          };
        }
      }

      return { pass: true, message: () => "SVG paths are approximately equal" };
    }

    // Original logic for numbers and arrays
    const received =
      Array.isArray(_received) || _received instanceof Float32Array
        ? _received
        : [_received];
    const argument =
      Array.isArray(_argument) || _received instanceof Float32Array
        ? _argument
        : [_argument];
    if (received.length !== argument.length) {
      return { pass: false, message: () => "Arrays have different lengths" };
    }

    for (let i = 0; i < received.length; i++) {
      if (
        isNaN(argument[i]) ||
        isNaN(received[i]) ||
        Math.abs(received[i] - argument[i]) > tolerance
      ) {
        const diffString = diff(received, argument);
        return {
          pass: false,
          message: () => `Element at index ${i} differ more than ${tolerance}:
${diffString}`,
        };
      }
    }
    return { pass: true, message: () => "Arrays are approximately equal" };
  },
});

// Export empty object to make this a module
export {};
