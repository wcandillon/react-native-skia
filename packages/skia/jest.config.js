/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Ignore lib folder - contains build artifacts and should
  // not be probed for tests
  modulePathIgnorePatterns: [
    "<rootDir>/lib",
    "(setup)|(setup.(ts|tsx))$|globalSetup.ts|globalTeardown.ts",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "./tsconfig.test.json" }],
  },
  globals: {},
  globalSetup: "<rootDir>/src/__tests__/globalSetup.ts",
  globalTeardown: "<rootDir>/src/__tests__/globalTeardown.ts",
};
