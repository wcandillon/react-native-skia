import "react-native";
import React from "react";
// Test renderer must be required after react-native.
import { cleanup, render } from "@testing-library/react-native";

import App from "./App";

it("renders correctly", () => {
  render(<App />);
});

afterEach(cleanup);
