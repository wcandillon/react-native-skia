import {
  executeCmdSync,
  checkFileExists,
  ensureFolderExists,
  getDistFolder,
} from "./utils";
import fs from "fs";
import { exit } from "process";

const pck = JSON.parse(fs.readFileSync("./package/package.json").toString());

/**
 * This build script builds the final NPM package of the
 * @shopify/react-native-skia packages.
 *
 * The build script requires that we have valid Skia binaries
 * in the libs folder.
 *
 * The script requires a valid build number in the environment
 * varable GITHUB_RUN_NUMBER. The version of the package will
 * the version set in the package/package.json file, and will
 * use this as the build number.
 *
 */

console.log("Building NPM package");
console.log("");

console.log("Checking prerequisites...");

// test for valid build number
if (process.env.GITHUB_RUN_NUMBER === undefined) {
  console.log(
    "Failed. Expected a valid build number in the environment variable GITHUB_RUN_NUMBER"
  );
  process.exit(1);
}

// FIXME: We can't use skia configuration here since it depends on
// iPhone SDKs that we get from xcrun...

// Check that Android Skia libs are built
["armeabi-v7a", "arm64-v8a", "x86", "x86_64"].forEach((cpu) => {
  ["libskia.a", "libskshaper.a", "libsvg.a", "libsksg.a"].forEach((target) => {
    const path = `./package/libs/android/${cpu}/${target}`;
    checkFileExists(
      path,
      `Skia Android ${path}`,
      "Have you built the Skia Android binaries? Run yarn run build."
    );
  });
});

// Check that iOS Skia frameworks are built
[
  "libskia.xcframework",
  "libskshaper.xcframework",
  "libsvg.xcframework",
  "libsksg.xcframework",
].forEach((lib) => {
  checkFileExists(
    `./package/libs/ios/${lib}`,
    `Skia iOS ${lib}`,
    "Have you built the Skia iOS binaries? Run yarn run build."
  );
});

console.log("Prerequisites verified successfully.");
ensureFolderExists(getDistFolder());

// Update version and save package.json
const majorMinor = pck.version.split(".").slice(0, 2).join(".");
const nextVersion = majorMinor + "." + process.env.GITHUB_RUN_NUMBER;
pck.version = nextVersion;
pck.types = "lib/typescript/index.d.ts";
pck.main = "lib/module/index.js";
pck.module = "lib/module/index.js";
pck["react-native"] = "lib/module/index.js";
console.log("Building version:", nextVersion);

// Overwrite the package.json file
fs.writeFileSync("./package/package.json", JSON.stringify(pck, null, 2));

// Now let's start to build it
const currentDir = process.cwd();
console.log("Entering directory `package`");
process.chdir("./package");

console.log("Build package", process.cwd());
executeCmdSync("yarn build");

console.log("Running `npm pack` in package folder", process.cwd());
executeCmdSync("npm pack");
process.chdir(currentDir);

console.log("Done building NPM package");

// Copy package to the dist folder
const packageFilename = `shopify-react-native-skia-${pck.version}.tgz`;
const packagePath = `./package/${packageFilename}`;
fs.renameSync(packagePath, `${getDistFolder()}/${packageFilename}`);

// Done!
console.log(
  `Written NPM package ${packageFilename} to ${getDistFolder()} folder.`
);
exit(0);
