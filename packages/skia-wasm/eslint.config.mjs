import wcandillon from "eslint-config-react-native-wcandillon";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "test-results/**", "*.mjs", "smoke/*.js"]
  },
  ...wcandillon
];
