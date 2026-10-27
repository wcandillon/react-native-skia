module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Ignore lib folder - contains build artifacts and should
  // not be probed for tests
  modulePathIgnorePatterns: [
    "<rootDir>/lib",
    "(setup)|(setup.(ts|tsx))$|globalSetup.ts|globalTeardown.ts|MockDeclaration.ts",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "./tsconfig.test.json" }],
  },
  // The source reads __DEV__, which react-native defines (its jest preset
  // sets it to true as well).
  globals: { __DEV__: true },
  globalSetup: "<rootDir>/src/__tests__/globalSetup.ts",
  globalTeardown: "<rootDir>/src/__tests__/globalTeardown.ts",
};