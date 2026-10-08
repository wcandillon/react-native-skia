// eslint.config.js
import wcandillon from "eslint-config-react-native-wcandillon";

export default [
  {
    ignores: ["lib/**", "dist/**", "android/build/**", "node_modules/**", "*.config.js", "jest.config.js", "*.mjs"]
  },
  ...wcandillon,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    rules: {
      "prefer-destructuring": [
        "error",
        {
          "object": true,
          "array": false
        }
      ],
      "no-bitwise": "off",
      "no-var": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
      "react-hooks/exhaustive-deps": [
        "error",
        {
          "additionalHooks": "(useFrame)"
        }
      ],
      "import/extensions": "off"
    }
  },
  {
    files: ["*.{js,jsx}", "scripts/**/*.js"],
    rules: {
      "prefer-destructuring": [
        "error",
        {
          "object": true,
          "array": false
        }
      ],
      "no-bitwise": "off",
      "no-var": "off",
      "react-hooks/exhaustive-deps": [
        "error",
        {
          "additionalHooks": "(useFrame)"
        }
      ],
      "import/extensions": "off"
    }
  }
];