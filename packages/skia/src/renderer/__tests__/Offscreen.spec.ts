import type * as Offscreen from "../Offscreen";

// react-native-worklets' RuntimeKind, set on every runtime it creates.
const RuntimeKind = { ReactNative: 1, UI: 2, Worker: 3 } as const;
type RuntimeKindValue = (typeof RuntimeKind)[keyof typeof RuntimeKind];

const mockPlatform = { OS: "ios" };

jest.mock("../../Platform", () => ({ Platform: mockPlatform }));
jest.mock("../../skia", () => ({ Skia: {} }));
jest.mock("../../sksg/Reconciler", () => ({ SkiaSGRoot: class {} }));

const { isOnMainThread } = require("../Offscreen") as typeof Offscreen;

const runtimeGlobals = globalThis as { __RUNTIME_KIND?: RuntimeKindValue };

const isOnMainThreadIn = (runtimeKind: RuntimeKindValue | undefined) => {
  runtimeGlobals.__RUNTIME_KIND = runtimeKind;
  try {
    return isOnMainThread();
  } finally {
    delete runtimeGlobals.__RUNTIME_KIND;
  }
};

describe.each(["android", "ios"])("isOnMainThread on %s", (OS) => {
  beforeEach(() => {
    mockPlatform.OS = OS;
  });

  it("is false on the React Native runtime", () => {
    expect(isOnMainThreadIn(RuntimeKind.ReactNative)).toBe(false);
  });

  it("is true on the UI runtime", () => {
    expect(isOnMainThreadIn(RuntimeKind.UI)).toBe(true);
  });

  it("is true on a worker runtime", () => {
    expect(isOnMainThreadIn(RuntimeKind.Worker)).toBe(true);
  });

  it("is false without react-native-worklets", () => {
    expect(isOnMainThreadIn(undefined)).toBe(false);
  });
});

describe("isOnMainThread on the web", () => {
  it("is true, as worklets run on the JS thread there", () => {
    mockPlatform.OS = "web";
    expect(isOnMainThreadIn(RuntimeKind.ReactNative)).toBe(true);
  });
});
