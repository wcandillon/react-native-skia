import "react-native";
import React from "react";
// Test renderer must be required after react-native.
import { cleanup, render } from "@testing-library/react-native";

import { Breathe } from "./Breathe";
import { Gooey } from "./Gooey";
import { Aurora } from "./Aurora";
import { Wallet } from "./Wallet";
import { Vertices } from "./Vertices";
import { Severance } from "./Severance";
import { PerformanceDrawingTest } from "./Performance/PerformanceRects";
import { GraphsScreen } from "./Graphs";
import { Neumorphism } from "./Neumorphism";
import { Matrix } from "./Matrix";
import { Hue } from "./Hue";
import { Glassmorphism } from "./Glassmorphism";
import { Filters } from "./Filters";
import { Boxes } from "./Boxes";

it("should render the Breathe example correctly", () => {
  render(<Breathe />);
});

it("should render the Gooey example correctly", () => {
  render(<Gooey />);
});

it("should render the Boxes example correctly", () => {
  render(<Boxes />);
});

it("should render the Aurora example correctly", () => {
  render(<Aurora />);
});

it("should render the Wallet example correctly", () => {
  render(<Wallet />);
});

it("should render the Vertices example correctly", () => {
  render(<Vertices />);
});

it("should render the Severance example correctly", () => {
  render(<Severance />);
});

it("should render the Performance example correctly", () => {
  render(<PerformanceDrawingTest />);
});

it("should render the Neumorphism example correctly", () => {
  render(<Neumorphism />);
});

it("should render the Matrix example correctly", () => {
  render(<Matrix />);
});

it("should render the Hue example correctly", () => {
  render(<Hue />);
});

it("should render the GraphsScreen example correctly", () => {
  render(<GraphsScreen />);
});

it("should render the Glassmorphism example correctly", () => {
  render(<Glassmorphism />);
});

it("should render the Filter example correctly", () => {
  render(<Filters />);
});

afterEach(cleanup);
