import React, { useEffect, useRef } from "react";
import type { ViewStyle } from "react-native";
import { Skia, SkiaGraphiteView } from "react-native-skia";
import type { SkiaGraphiteViewRef } from "react-native-skia";

// Fills itself in cyan with the one frame it records once mounted.
const CyanGraphiteView = ({ style }: { style: ViewStyle }) => {
  const ref = useRef<SkiaGraphiteViewRef>(null);
  useEffect(() => {
    const view = ref.current;
    if (view === null) {
      return;
    }
    const context = view.getContext();
    const canvas = context.beginRecording();
    canvas.clear(Skia.Color("cyan"));
    context.submit(context.finishRecording());
  }, []);
  return <SkiaGraphiteView ref={ref} style={style} />;
};

export const GraphiteView = () => <CyanGraphiteView style={{ flex: 1 }} />;

export const GraphiteViewTransform = () => (
  <CyanGraphiteView style={{ flex: 1, transform: [{ scale: 0.5 }] }} />
);
