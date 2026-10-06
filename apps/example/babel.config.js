module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    // three.js ships untranspiled static class blocks
    "@babel/plugin-transform-class-static-block",
    "react-native-reanimated/plugin",
    "transform-inline-environment-variables",
    "@babel/plugin-proposal-explicit-resource-management",
  ],
};
