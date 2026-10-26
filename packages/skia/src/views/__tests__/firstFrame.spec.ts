import { listenToFirstFrame, notifyFirstFrame } from "../firstFrame";

describe("firstFrame", () => {
  it("calls the listener of the view the native side reports", () => {
    const listener = jest.fn();
    const other = jest.fn();
    const unsubscribe = listenToFirstFrame(1000, listener);
    const unsubscribeOther = listenToFirstFrame(1001, other);
    // What RNSkView::notifyFirstFrame calls
    global.__skiaOnFirstFrame?.(1000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    unsubscribe();
    unsubscribeOther();
  });

  it("calls the listener once", () => {
    const listener = jest.fn();
    const unsubscribe = listenToFirstFrame(1002, listener);
    notifyFirstFrame(1002);
    notifyFirstFrame(1002);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("does not call a listener removed before the first frame", () => {
    const listener = jest.fn();
    const unsubscribe = listenToFirstFrame(1003, listener);
    unsubscribe();
    notifyFirstFrame(1003);
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not replay a first frame for a listener that comes later", () => {
    notifyFirstFrame(1004);
    const listener = jest.fn();
    const unsubscribe = listenToFirstFrame(1004, listener);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("keeps the listener of a view when an older one unsubscribes", () => {
    const first = jest.fn();
    const second = jest.fn();
    const unsubscribeFirst = listenToFirstFrame(1005, first);
    const unsubscribeSecond = listenToFirstFrame(1005, second);
    unsubscribeFirst();
    notifyFirstFrame(1005);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribeSecond();
  });
});
