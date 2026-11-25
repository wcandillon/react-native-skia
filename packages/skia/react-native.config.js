// RN 0.87.1 reads spm here; RN 0.88+ also reads package.json's swiftpmConfig.
// Keep the product name stable and install binary preparation without app config.
module.exports = {
  spm: {
    name: 'ReactNativeSkia',
    autolinkingPlugin: './scripts/spm-plugin.js',
  },
};
