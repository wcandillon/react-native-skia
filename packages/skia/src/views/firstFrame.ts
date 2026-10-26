declare global {
  // Called by the native view (RNSkView::notifyFirstFrame) with its id once
  // it has shown its first frame.
  var __skiaOnFirstFrame: ((nativeId: number) => void) | undefined;
}

const listeners = new Map<number, () => void>();

/**
 * Tells the listener of a view, if any, that the view has shown its first
 * frame. Called by the native view through `global.__skiaOnFirstFrame`, and
 * by the web view once its first frame is painted.
 */
export const notifyFirstFrame = (nativeId: number) => {
  const listener = listeners.get(nativeId);
  if (listener) {
    listeners.delete(nativeId);
    listener();
  }
};

global.__skiaOnFirstFrame = notifyFirstFrame;

/**
 * Calls `listener` once the view shows its first frame. Returns a function
 * that removes the listener. Subscribe before the view mounts (in a layout
 * effect): the first frame is reported once, and is not replayed for a
 * listener that comes later.
 */
export const listenToFirstFrame = (nativeId: number, listener: () => void) => {
  listeners.set(nativeId, listener);
  return () => {
    if (listeners.get(nativeId) === listener) {
      listeners.delete(nativeId);
    }
  };
};
