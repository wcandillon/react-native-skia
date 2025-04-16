module.exports = {
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^.+.(css|styl|less|sass|scss|png|jpg|ttf|otf|woff|woff2)$":
      "jest-transform-stub",
    "^react-native$": "<rootDir>/../../node_modules/react-native",
  },
  modulePathIgnorePatterns: ["<rootDir>/lib/typescript", "setup.(ts|tsx)$"],
  setupFilesAfterEnv: [
    "<rootDir>/../../node_modules/react-native-gesture-handler/jestSetup.js",
    "<rootDir>/jestSetup.mjs",
  ],
  preset: "react-native",
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|react-native.*|@?react-navigation.*)/)",
  ],
};
