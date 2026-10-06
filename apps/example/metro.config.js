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

// three.js ships several builds; always use the WebGPU one so that both
// `three` and `three/webgpu` resolve to the same module instance, and map the
// `three/addons/*` alias (which relies on package exports) to examples/jsm.
function resolveThree(moduleName) {
  if (moduleName.startsWith("three/addons/")) {
    return {
      filePath: path.resolve(
        threePackagePath,
        "examples/jsm/" + moduleName.replace("three/addons/", "") + ".js",
      ),
      type: "sourceFile",
    };
  }
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
  return null;
}

const baseConfig = makeMetroConfig({
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});

const baseResolveRequest =
  baseConfig.resolver.resolveRequest ??
  ((context, moduleName, platform) =>
    defaultResolve(context, moduleName, platform));

const metroConfig = {
  ...baseConfig,
  resolver: {
    ...baseConfig.resolver,
    assetExts: [
      ...baseConfig.resolver.assetExts,
      "glb",
      "gltf",
      "bin",
      "hdr",
    ],
    resolveRequest: (context, moduleName, platform) =>
      resolveThree(moduleName) ??
      baseResolveRequest(context, moduleName, platform),
  },
};

// Serve index.html for navigation requests like /api/shapes so that
// react-navigation deep links work on web (history API fallback).
// This runs at the end of the dev server middleware chain, after the static
// file server, so it only sees requests nothing else handled.
function historyApiFallback(middleware) {
  const fs = require("fs");
  const indexHtml = path.join(__dirname, "index.html");
  return (req, res, next) => {
    const url = (req.url ?? "").split("?")[0];
    const isNavigation =
      req.method === "GET" &&
      (req.headers.accept ?? "").includes("text/html") &&
      !url.includes(".");
    if (isNavigation && url !== "/") {
      res.setHeader("Content-Type", "text/html; charset=UTF-8");
      fs.createReadStream(indexHtml).pipe(res);
      return undefined;
    }
    return middleware(req, res, next);
  };
}

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

  config.server = config.server ?? {};
  const origEnhanceMiddleware = config.server.enhanceMiddleware;
  config.server.enhanceMiddleware = (middleware, server) =>
    historyApiFallback(
      origEnhanceMiddleware
        ? origEnhanceMiddleware(middleware, server)
        : middleware,
    );

  return config;
}

module.exports = !!process.env.IS_WEB_BUILD
  ? getWebMetroConfig(metroConfig)
  : metroConfig;
