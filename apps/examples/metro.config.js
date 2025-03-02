const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration for a monorepo
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // 1. Watch all files in the monorepo
  watchFolders: [
    path.resolve(__dirname, '../../'), // Monorepo root, assuming this is in apps/examples
  ],
  
  // 2. Set up proper module resolution for workspace packages
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'), // Monorepo root node_modules
    ],
    
    // Allow importing from workspace packages
    extraNodeModules: {
      // Add mappings for workspace packages here as needed
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);