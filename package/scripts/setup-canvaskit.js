#!/usr/bin/env node
/* eslint-disable max-len */

/**
 * A script to automate the setup of `@shopify/react-native-skia` for web.
 * The only requirement is that your project supports a 'static' folder (often named '/public').
 * In `@expo/webpack-config` this is `./web` (default for now).
 *
 * This script does the following:
 * 1. Resolve the public path relative to wherever the script is being run.
 * 2. Log out some useful info about the web setup, just in case anything goes wrong.
 * 3. Resolve the installed wasm file `canvaskit-wasm/bin/full/canvaskit.wasm`
 *  from `@shopify/react-native-skia -> canvaskit`.
 * 4. Recursively ensure the path exists and copy the file into the desired location.
 *
 *
 * Usage:
 * $ `npx <script> web`
 *
 * -> Copies the file to `<project>/web/static/js/canvaskit.wasm`
 *
 * Tooling that uses `/public`:
 * $ `npx <script> public`
 *
 * -> Copies the file to `<project>/public/static/js/canvaskit.wasm`
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

const gray = (text) => `\x1b[90m${text}\x1b[0m`;
const lime = (text) => `\x1b[32m${text}\x1b[0m`;

function getWasmFilePath() {
  try {
    return require.resolve("canvaskit-wasm/bin/full/canvaskit.wasm");
  } catch (error) {
    console.error(
      `Could not find 'canvaskit-wasm'. Please install '@shopify/react-native-skia' and ensure it can be resolved from your project: ${process.cwd()}`
    );
    process.exit(1);
  }
}

function getOutputFilePath() {
  // Default to using `web` public path.
  const publicFolder = path.resolve(args[0] || "web");
  const publicLocation = "./static/js/canvaskit.wasm";
  const output = path.join(publicFolder, publicLocation);

  console.log(
    `› Copying 'canvaskit.wasm' file to static folder:\n  ${gray(output)}\n`
  );
  return output;
}

function copyFile(from, to) {
  const data = fs.readFileSync(from);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, data);
}

// Copy the WASM file to `<static>/static/js/canvaskit.wasm`
(() => {
  copyFile(getWasmFilePath(), getOutputFilePath());

  console.log(lime("› Success! You are almost there:"));
  console.log(
    gray(
      "› To load React Native Skia Web, follow these instructions : https://shopify.github.io/react-native-skia/docs/getting-started/web"
    )
  );
})();
