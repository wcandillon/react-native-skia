import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Sorted patch filenames in a directory. The build applies and the metadata
 * records this same list, so both skip the same entries.
 */
export const listPatches = (patchesDir: string) =>
  fs
    .readdirSync(patchesDir, { withFileTypes: true })
    // Finder's ._*.patch metadata files are not patches.
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.startsWith(".") &&
        entry.name.endsWith(".patch")
    )
    .map((entry) => entry.name)
    .sort();

/**
 * Applies a sorted patch directory, skipping changes already present and failing
 * on stale patches. Header copies use only sections targeting files they contain.
 */
export const applyPatches = (
  sourceDir: string,
  patchesDir: string,
  { copiedFilesOnly = false }: { copiedFilesOnly?: boolean } = {}
) => {
  // The directory identifies Skia or Dawn patches; filenames need no prefix.
  // Sort once so builds and copied headers process patches in the same order.
  const patches = listPatches(patchesDir);

  for (const name of patches) {
    let patch = fs.readFileSync(path.join(patchesDir, name), "utf-8");
    if (copiedFilesOnly) {
      // A patch can touch headers, implementation files, and build rules.
      // Keep complete file sections only for paths present in the header copy.
      patch = patch
        .split(/^(?=diff --git )/m)
        .filter((section) => {
          const target = section.match(/^diff --git a\/\S+ b\/(\S+)/)?.[1];
          return target && fs.existsSync(path.join(sourceDir, target));
        })
        .join("");
      if (!patch) {
        continue;
      }
    }

    const gitApply = (args: string[]) =>
      execFileSync("git", ["apply", ...args], {
        cwd: sourceDir,
        // Send patches on stdin; no temporary patch file or shell quoting needed.
        input: patch,
        // Header copies are ignored by the enclosing repository. Stop its
        // discovery so git apply patches those files instead of skipping them.
        env: {
          ...process.env,
          GIT_CEILING_DIRECTORIES: path.dirname(sourceDir),
        },
        stdio: "pipe",
      });
    // Probe without modifying files before choosing apply or already present.
    // Returns null when the patch applies, or git's error message when it does
    // not. Anything other than git exiting non-zero (no git on PATH, a missing
    // sourceDir) is rethrown instead of being reported as a stale patch.
    const check = (args: string[]): string | null => {
      try {
        gitApply(["--check", ...args]);
        return null;
      } catch (e) {
        const err = e as { status?: number | null; stderr?: Buffer };
        if (typeof err.status !== "number") {
          throw e;
        }
        return (
          err.stderr?.toString().trim() ||
          `git apply exited with status ${err.status}`
        );
      }
    };

    const forwardError = check([]);
    if (forwardError === null) {
      // Let an actual application failure propagate instead of logging success.
      gitApply([]);
      console.log(`🩹 Applied ${name} to ${sourceDir}`);
    } else if (check(["--reverse"]) === null) {
      // A previous build or the pinned upstream revision may contain the fix.
      // Header copies may also come from a checkout that was already patched.
      console.log(`✅ ${name} is already in ${sourceDir}`);
    } else {
      // Neither direction matches: require a refresh or removal at the upgrade.
      throw new Error(
        `${name} does not apply to ${sourceDir}: the patched code changed upstream. Check whether the pinned checkout already carries an equivalent change and drop or refresh the patch.\n${forwardError}`
      );
    }
  }
};
