const path = require("path");
const { makeMetroConfig } = require("@rnx-kit/metro-config");

const { dependencies } = require("./package.json");

const config = makeMetroConfig({
  projectRoot: __dirname,
  transformer: {
    // Ignore sibling apps' Babel configs when compiling their shared sources.
    enableBabelRCLookup: false,
    getTransformOptions: async () => ({
      transform: { experimentalImportSupport: false, inlineRequires: true },
    }),
  },
});

const resolveRequest = config.resolver.resolveRequest;
const entryPoint = path.join(__dirname, "index.js");
const threeRoot = path.dirname(path.dirname(require.resolve("three/webgpu")));

// Resolve app dependencies from here, including imports made by shared sources
// and Skia's workspace. This keeps React, Reanimated and Worklets singletons.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const packageName = moduleName.startsWith("@")
    ? moduleName.split("/").slice(0, 2).join("/")
    : moduleName.split("/")[0];

  // Match the shared example's WebGPU three.js build and addon aliases.
  if (moduleName === "three" || moduleName === "three/webgpu") {
    return {
      type: "sourceFile",
      filePath: path.join(threeRoot, "build/three.webgpu.js"),
    };
  }
  if (moduleName === "three/tsl") {
    return {
      type: "sourceFile",
      filePath: path.join(threeRoot, "build/three.tsl.js"),
    };
  }
  if (moduleName.startsWith("three/addons/")) {
    return {
      type: "sourceFile",
      filePath: path.join(
        threeRoot,
        "examples/jsm",
        moduleName.slice("three/addons/".length) + ".js"
      ),
    };
  }

  return resolveRequest(
    dependencies[packageName]
      ? { ...context, originModulePath: entryPoint }
      : context,
    moduleName,
    platform
  );
};

config.resolver.assetExts.push("glb", "gltf", "bin", "hdr");

module.exports = config;
