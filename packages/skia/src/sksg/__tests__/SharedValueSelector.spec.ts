import type { SharedValue } from "react-native-reanimated";

import { select } from "../../renderer/processors/Animations/Animations";
import { isSharedValueSelector } from "../utils";
import { materializeCommand, CommandType } from "../Recorder/Core";
import { Recorder } from "../Recorder/Recorder";

// Minimal stand-in for a Reanimated shared value: the guard only checks the
// `_isReanimatedSharedValue` flag, so we don't need the Reanimated runtime.
const makeSharedValue = <T>(value: T) =>
  ({ _isReanimatedSharedValue: true, value }) as unknown as SharedValue<T>;

describe("isSharedValueSelector", () => {
  it("returns true for a selector", () => {
    const sv = makeSharedValue({ x: 1 });
    expect(isSharedValueSelector({ __sv: sv, __key: "x" })).toBe(true);
  });

  it("returns false for a plain shared value", () => {
    expect(isSharedValueSelector(makeSharedValue(1))).toBe(false);
  });

  it("returns false for invalid shapes", () => {
    expect(isSharedValueSelector(null)).toBe(false);
    expect(isSharedValueSelector(42)).toBe(false);
    expect(isSharedValueSelector({})).toBe(false);
    // __sv missing
    expect(isSharedValueSelector({ __key: "x" })).toBe(false);
    // __sv is not a shared value
    expect(isSharedValueSelector({ __sv: { value: {} }, __key: "x" })).toBe(
      false
    );
    // __key missing
    expect(isSharedValueSelector({ __sv: makeSharedValue({}) })).toBe(false);
    // __key is not a string
    expect(isSharedValueSelector({ __sv: makeSharedValue({}), __key: 3 })).toBe(
      false
    );
  });
});

describe("select", () => {
  it("creates a selector the guard recognizes", () => {
    const sv = makeSharedValue({ x: 10, y: 20 });
    const selector = select(sv, "x");
    expect(selector).toEqual({ __sv: sv, __key: "x" });
    expect(isSharedValueSelector(selector)).toBe(true);
  });
});

describe("materializeCommand", () => {
  it("resolves a plain shared value via .value", () => {
    const command = {
      type: CommandType.DrawCircle,
      props: { r: 0 },
      animatedProps: { r: makeSharedValue(10) },
    };
    expect(materializeCommand(command).props.r).toBe(10);
  });

  it("resolves a selector via __sv.value[__key]", () => {
    const sv = makeSharedValue({ x: 5, y: 8 });
    const command = {
      type: CommandType.DrawCircle,
      props: { cx: 0, cy: 0 },
      animatedProps: { cx: select(sv, "x"), cy: select(sv, "y") },
    };
    const { props } = materializeCommand(command);
    expect(props.cx).toBe(5);
    expect(props.cy).toBe(8);
  });

  it("does not crash when the grouped value is null", () => {
    const sv = makeSharedValue<{ x: number }>(null as unknown as { x: number });
    const command = {
      type: CommandType.DrawCircle,
      props: { cx: 0 },
      animatedProps: { cx: select(sv, "x") },
    };
    expect(() => materializeCommand(command)).not.toThrow();
    expect(materializeCommand(command).props.cx).toBeUndefined();
  });
});

describe("Recorder selector collection (web path)", () => {
  it("registers one shared value for many selectors of the same value", () => {
    const sv = makeSharedValue({ x: 1, y: 2 });
    const recorder = new Recorder();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: any = { cx: select(sv, "x"), cy: select(sv, "y"), r: 3 };
    recorder.drawCircle(props);
    const { animationValues } = recorder.getRecording();
    expect(animationValues.size).toBe(1);
    expect([...animationValues][0]).toBe(sv);
  });

  it("registers a plain shared value and a selector's underlying value", () => {
    const grouped = makeSharedValue({ x: 1 });
    const plain = makeSharedValue(5);
    const recorder = new Recorder();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: any = { cx: select(grouped, "x"), r: plain };
    recorder.drawCircle(props);
    const { animationValues } = recorder.getRecording();
    expect(animationValues.size).toBe(2);
  });
});
