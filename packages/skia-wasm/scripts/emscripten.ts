/**
 * Finds the Emscripten release the Skia archives were compiled with. Objects
 * from different releases are not meant to be linked together, so a toolchain
 * of another version is reported instead of used.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { PackageRoot } from "./skia";

const versionOf = (directory: string) => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(directory, "emscripten-version.txt"), "utf8")
    ) as string;
  } catch {
    return undefined;
  }
};

const onPath = () => {
  try {
    const compiler = execFileSync("which", ["em++"]).toString().trim();
    return path.dirname(fs.realpathSync(compiler));
  } catch {
    return undefined;
  }
};

/** The directory holding em++, for the given Emscripten version. */
export const findEmscripten = (version: string) => {
  const candidates = [
    // An activated emsdk exports EMSDK.
    process.env.EMSDK && path.join(process.env.EMSDK, "upstream", "emscripten"),
    // The emsdk the Skia checkout pins, installed by `yarn build-skia wasm`.
    path.join(
      PackageRoot,
      "../../externals/skia/third_party/externals/emsdk/upstream/emscripten"
    ),
    onPath(),
  ].filter((candidate): candidate is string => !!candidate);

  const found: string[] = [];
  for (const candidate of candidates) {
    const candidateVersion = versionOf(candidate);
    if (candidateVersion === version) {
      return candidate;
    }
    if (candidateVersion) {
      found.push(`${candidateVersion} (${candidate})`);
    }
  }
  throw new Error(
    `The Skia archives need Emscripten ${version}; found ${
      found.length > 0 ? found.join(", ") : "none"
    }. Install it with \`emsdk install ${version} && emsdk activate ${version}\` and set EMSDK.`
  );
};
