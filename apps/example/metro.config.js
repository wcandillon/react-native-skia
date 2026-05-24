const path = require("path");
const { resolve: defaultResolve } = require("metro-resolver");
const { makeMetroConfig } = require("@rnx-kit/metro-config");

const root = path.resolve(__dirname, "../..");
const rnwPath = path.resolve(root, "node_modules/react-native-web");
const assetRegistryPath = path.resolve(
  root,
  "node_modules/react-native-web/dist/modules/AssetRegistry/index",
);
const threePackagePath = path.resolve(root, "node_modules/three");
const r3fPath = path.resolve(root, "node_modules/@react-three/fiber");

function resolveThree(moduleName) {
  if (moduleName === "three" || moduleName === "three/webgpu") {
    return {
      filePath: path.resolve(threePackagePath, "build/three.webgpu.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "three/tsl") {
    return {
      filePath: path.resolve(threePackagePath, "build/three.tsl.js"),
      type: "sourceFile",
    };
  }
  if (moduleName.startsWith("three/addons/")) {
    return {
      filePath: path.resolve(
        threePackagePath,
        "examples/jsm/" + moduleName.replace("three/addons/", "") + ".js",
      ),
      type: "sourceFile",
    };
  }
  if (moduleName === "@react-three/fiber") {
    return {
      filePath: path.resolve(r3fPath, "dist/react-three-fiber.esm.js"),
      type: "sourceFile",
    };
  }
  return null;
}

const metroConfig = makeMetroConfig({
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});

metroConfig.resolver = metroConfig.resolver ?? {};
metroConfig.resolver.extraNodeModules = {
  ...(metroConfig.resolver.extraNodeModules ?? {}),
  three: threePackagePath,
};
metroConfig.resolver.assetExts = [
  ...(metroConfig.resolver.assetExts ?? []),
  "glb",
  "gltf",
  "jpg",
  "bin",
  "hdr",
  "mp4",
  "mov",
];
metroConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const three = resolveThree(moduleName);
  if (three) {
    return three;
  }
  return defaultResolve(context, moduleName, platform);
};

function getWebMetroConfig(config) {
  config.resolver = config.resolver ?? {};
  config.resolver.platforms = ["ios", "android", "web"];

  const origResolveRequest =
    config.resolver.resolveRequest ??
    ((context, moduleName, platform) =>
      defaultResolve(context, moduleName, platform));

  config.resolver.resolveRequest = (contextRaw, moduleName, platform) => {
    const context = {
      ...contextRaw,
      preferNativePlatform: false,
    };

    if (moduleName === "react-native") {
      return {
        filePath: path.resolve(rnwPath, "dist/index.js"),
        type: "sourceFile",
      };
    }

    // Let default config handle other modules
    return origResolveRequest(context, moduleName, platform);
  };

  config.transformer = config.transformer ?? {};
  config.transformer.assetRegistryPath = assetRegistryPath;

  return config;
}

module.exports = !!process.env.IS_WEB_BUILD
  ? getWebMetroConfig(metroConfig)
  : metroConfig;
