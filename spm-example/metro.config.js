const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// react-native-skia is symlinked to ../packages/skia, so Metro must
// watch the monorepo root. React and React Native have to be forced to this
// app's copies: the workspace root carries different versions, and two React
// instances make hooks resolve against a null module inside Skia's components.
const monorepoRoot = path.resolve(__dirname, '..');
const appModules = path.resolve(__dirname, 'node_modules');
const singletons = ['react', 'react-native'];

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [appModules, path.resolve(monorepoRoot, 'node_modules')],
    resolveRequest: (context, moduleName, platform) => {
      const name = singletons.find(
        s => moduleName === s || moduleName.startsWith(`${s}/`),
      );
      const target = name
        ? path.join(appModules, name, moduleName.slice(name.length))
        : moduleName;
      return context.resolveRequest(context, target, platform);
    },
  },
});
