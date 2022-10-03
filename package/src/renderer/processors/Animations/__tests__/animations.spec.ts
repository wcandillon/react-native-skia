import { Selector } from "../../../../values";
import { RNSkValue } from "../../../../values/web/RNSkValue";
import { isSelector, isValue } from "../Animations";

describe("Animations", () => {
  describe("isValue", () => {
    it("should return true for a Skia value", async () => {
      const value = new RNSkValue(["red", "green"]);
      expect(isValue(value)).toBe(true);
    });
    it("should return false for a Skia Selector", async () => {
      const value = new RNSkValue(["red", "green"]);
      const selector = Selector(value, (v) => v);
      expect(isValue(selector)).toBe(false);
    });
  });
  describe("isSelector", () => {
    it("should return false for a Skia value", async () => {
      const value = new RNSkValue(["red", "green"]);
      expect(isSelector(value)).toBe(false);
    });
    it("should return true for a Skia Selector", async () => {
      const value = new RNSkValue(["red", "green"]);
      const selector = Selector(value, (v) => v);
      expect(isSelector(selector)).toBe(true);
    });
  });
});
