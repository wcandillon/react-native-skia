import React, { memo, useEffect, useState } from "react";
import { View } from "react-native";
import { Canvas, Fill } from "react-native-skia";

import { useScreenDone } from "../ScreenDone";

// The Canvas must not re-render as its ancestor changes display. Fabric drops
// the native view of a display: none subtree, then creates another one when
// it is shown again; the replacement must receive this unchanged recording.
const Scene = memo(function DisplayNoneScene() {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="red" />
    </Canvas>
  );
});

type Stage = "shownInitially" | "hidden" | "shownAgain";

export const DisplayNone = () => {
  const [stage, setStage] = useState<Stage>("shownInitially");
  const done = useScreenDone();

  useEffect(() => {
    let frame: number | null = null;
    if (stage === "shownInitially") {
      // The Canvas has committed its recording by the time this effect runs.
      setStage("hidden");
    } else if (stage === "hidden") {
      // Give Fabric a frame with the subtree hidden before showing it again.
      frame = requestAnimationFrame(() => setStage("shownAgain"));
    } else {
      done();
    }
    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [done, stage]);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          display: stage === "hidden" ? "none" : "flex",
        }}
      >
        <Scene />
      </View>
    </View>
  );
};
