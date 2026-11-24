import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import type { AppleSDK } from "./apple-configuration";
import { appleConfigurations, appleSDKs } from "./apple-configuration";

/**
 * Lipo architectures of the same SDK into universal <root>/<sdk>/*.a libraries.
 * Single-architecture SDKs and local builds copy their archives directly.
 * Remove consumed staging directories only after all SDK libraries and metadata
 * are written; compilation intermediates remain available for incremental builds.
 */
export const combineAppleLibraries = (
  root: string,
  libraries: string[],
  sdks: AppleSDK[] = appleSDKs,
  builtTargets?: string[]
) => {
  for (const sdk of sdks) {
    const configuration = appleConfigurations[sdk];
    const available = configuration.architectures.filter((architecture) => {
      const target = `${sdk}-${architecture}`;
      // Do not combine an architecture left over from an earlier source build.
      if (builtTargets && !builtTargets.includes(target)) {
        return false;
      }
      const present = libraries.filter((library) =>
        fs.existsSync(path.join(root, target, library))
      );
      if (present.length > 0 && present.length !== libraries.length) {
        throw new Error(
          `Incomplete Apple libraries in ${path.join(root, target)}`
        );
      }
      return present.length > 0;
    });
    if (available.length === 0) {
      continue;
    }
    const destination = path.join(root, sdk);
    // Recreate the SDK output so removed libraries or architectures cannot linger.
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(destination, { recursive: true });
    for (const library of libraries) {
      const inputs = available.map((architecture) =>
        path.join(root, `${sdk}-${architecture}`, library)
      );
      const output = path.join(destination, library);
      if (inputs.length === 1) {
        fs.copyFileSync(inputs[0], output);
      } else {
        execFileSync("lipo", ["-create", ...inputs, "-output", output], {
          stdio: "inherit",
        });
      }
    }
    // Build-time consumers can identify slices without assuming directory names.
    fs.writeFileSync(
      path.join(destination, "metadata.json"),
      JSON.stringify(
        {
          sdk,
          platform: configuration.platform,
          variant: configuration.variant,
          architectures: available,
          minimumDeploymentTarget: configuration.minimumTarget,
          libraries,
        },
        null,
        2
      ) + "\n"
    );
    // Successful SDK output replaces these copies; keep inputs if assembly fails.
    for (const architecture of available) {
      fs.rmSync(path.join(root, `${sdk}-${architecture}`), {
        recursive: true,
        force: true,
      });
    }
    const missing = configuration.architectures.filter(
      (architecture) => !available.includes(architecture)
    );
    if (missing.length > 0) {
      console.warn(`⚠️ ${sdk}: missing architectures ${missing.join(", ")}`);
    }
    console.log(`✅ ${destination} (${available.join(", ")})`);
  }
};

/** Require all configured architectures and libraries before publishing an SDK. */
export const validateAppleLibraries = (root: string, libraries: string[]) => {
  for (const sdk of appleSDKs) {
    const destination = path.join(root, sdk);
    const metadata = JSON.parse(
      fs.readFileSync(path.join(destination, "metadata.json"), "utf8")
    );
    const expected = appleConfigurations[sdk].architectures;
    if (
      metadata.sdk !== sdk ||
      !Array.isArray(metadata.architectures) ||
      metadata.architectures.length !== expected.length ||
      expected.some(
        (architecture) => !metadata.architectures.includes(architecture)
      )
    ) {
      throw new Error(`Incomplete architectures for ${sdk} in ${destination}`);
    }
    for (const library of libraries) {
      if (!fs.existsSync(path.join(destination, library))) {
        throw new Error(`Missing ${path.join(destination, library)}`);
      }
    }
  }
};
