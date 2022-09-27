// metro.config.js
//
// with multiple workarounds for this issue with symlinks:
// https://github.com/facebook/metro/issues/1
//
// with thanks to @johnryan (<https://github.com/johnryan>)
// for the pointers to multiple workaround solutions here:
// https://github.com/facebook/metro/issues/1#issuecomment-541642857
//
// see also this discussion:
// https://github.com/brodybits/create-react-native-module/issues/232

const path = require("path");
const exclusionList = require("metro-config/src/defaults/exclusionList");

const glob = require("glob-to-regexp");

function getBlacklist() {
  const nodeModuleDirs = [
    glob(`${path.resolve(__dirname, "../package")}/node_modules/*`),
  ];
  return exclusionList(nodeModuleDirs);
}

module.exports = {
  // workaround for an issue with symlinks encountered starting with
  // metro@0.55 / React Native 0.61
  // (not needed with React Native 0.60 / metro@0.54)
  resolver: {
    extraNodeModules: new Proxy(
      {},
      { get: (_, name) => path.resolve(".", "node_modules", name) }
    ),
    // /dist\/.*/
    blacklistRE: getBlacklist(),
  },

  // quick workaround for another issue with symlinks
  watchFolders: [path.resolve("."), path.resolve("../package")],

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
