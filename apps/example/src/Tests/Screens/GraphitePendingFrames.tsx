import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Skia, SkiaGraphiteView } from "react-native-skia";
import type { SkiaGraphiteViewRef } from "react-native-skia";

import { useScreenDone } from "../ScreenDone";

const SMALL = 60;
const LARGE = 120;
const STEP = 6;
const FRAMES = 240;
const WAIT_MS = 8000;

// A Graphite view that resizes a few points per frame while JS submits two
// recordings per display frame, so that the view presents queues of mixed
// sizes while the window resizes under it (see RNSkView::presentOrKeep). Once
// the loop ends and the queue has drained, pendingFrames must be back at 0:
// the view then fills itself in lime, or in blue when recordings were lost
// from the count.
export const GraphitePendingFrames = () => {
  const ref = useRef<SkiaGraphiteViewRef>(null);
  const [size, setSize] = useState(SMALL);
  const done = useScreenDone();
  useEffect(() => {
    const view = ref.current;
    if (view === null) {
      return;
    }
    const context = view.getContext();
    const record = (color: string) => {
      const canvas = context.beginRecording();
      canvas.clear(Skia.Color(color));
      const recording = context.finishRecording();
      context.submit(recording);
      recording.dispose();
    };
    let frames = 0;
    const t0 = Date.now();
    console.log(`[GPF] start`);
    let current = SMALL;
    let direction = 1;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const step = () => {
      frames += 1;
      record("red");
      record("red");
      current += direction * STEP;
      if (current >= LARGE || current <= SMALL) {
        direction = -direction;
      }
      setSize(current);
      if (frames < FRAMES) {
        frame = requestAnimationFrame(step);
        return;
      }
      // The queue drains at the display's rate: wait for pendingFrames to
      // come back to 0, which it never does when the view lost count.
      const startedWaiting = Date.now();
      console.log(`[GPF] loop done in ${startedWaiting - t0}ms pending=${context.pendingFrames}`);
      const settleStep = () => {
        const pending = context.pendingFrames;
        console.log(`[GPF] settle t=${Date.now() - startedWaiting}ms pending=${pending}`);
        if (pending > 0 && Date.now() - startedWaiting < WAIT_MS) {
          settle = setTimeout(settleStep, 100);
          return;
        }
        console.log(`[GPF] final ${pending === 0 ? "lime" : "blue"} total=${Date.now() - t0}ms`);
        record(pending === 0 ? "lime" : "blue");
        done();
      };
      settle = setTimeout(settleStep, 100);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [done]);
  return (
    <View style={{ width: LARGE, height: LARGE, backgroundColor: "cyan" }}>
      <SkiaGraphiteView ref={ref} style={{ width: size, height: size }} />
    </View>
  );
};
