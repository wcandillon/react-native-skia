import { shallowEq } from "../typeddash";

describe("shallowEq", () => {
  it("holds for props whose every value is the same", () => {
    const paint = {};
    expect(
      shallowEq({ color: "red", cx: 1, paint }, { color: "red", cx: 1, paint })
    ).toBe(true);
  });

  it("fails for a value that differs", () => {
    expect(shallowEq({ cx: 1, r: 4 }, { cx: 1, r: 5 })).toBe(false);
  });

  it("fails for an object made again, however equal its contents", () => {
    expect(shallowEq({ points: [1, 2] }, { points: [1, 2] })).toBe(false);
  });

  it("skips children", () => {
    expect(shallowEq({ children: "a", r: 4 }, { children: "b", r: 4 })).toBe(
      true
    );
  });

  it("ignores children on either side", () => {
    expect(shallowEq({ r: 5, children: [] }, { r: 5 })).toBe(true);
    expect(shallowEq({ r: 5 }, { r: 5, children: [] })).toBe(true);
  });

  it("fails for a key only one side declares", () => {
    expect(shallowEq({ r: 4 }, { cx: 1, r: 4 })).toBe(false);
    expect(shallowEq({ cx: undefined, r: 4 }, { r: 4 })).toBe(false);
  });

  it("fails when keys differ but counts match", () => {
    expect(shallowEq({ r: 5, start: undefined }, { r: 5, end: 0.5 })).toBe(
      false
    );
  });
});
