// Shared example files must use the Worklets plugin matching this native app.
module.exports = {
  presets: [require.resolve("@react-native/babel-preset")],
  plugins: [
    require.resolve("@babel/plugin-transform-class-static-block"),
    require.resolve("babel-plugin-transform-inline-environment-variables"),
    require.resolve("@babel/plugin-proposal-explicit-resource-management"),
    require.resolve("react-native-worklets/plugin"),
  ],
};
