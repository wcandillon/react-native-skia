import { useCallback, useEffect, useMemo, useState } from "react";
import { Skia } from "@shopify/react-native-skia";
import type { ProducerStats, SkPicture } from "@shopify/react-native-skia";

import type { Mode } from "./api";

export interface NativeProducerOptions {
  mode: Mode;
  /** Producer threads; view `i` belongs to thread `i % threads`. */
  threads: number;
  /** One picture per slot (or a single shared one); unused by the chart. */
  fields?: SkPicture[] | null;
  /** Card color (behind the scene) and page color (outside the corners). */
  background: string;
  page?: string;
  cornerRadius?: number;
  /** Recording mode: who presents. */
  present?: "main" | "producer";
  /** Field scene options. */
  kaleidoscope?: boolean;
  draw?: "picture" | "direct" | "svg";
  circles?: number;
  radius?: number;
  svg?: string;
  /** Chart scene: `bars` bars and a line per view, no picture. */
  scene?: "field" | "chart";
  bars?: number;
  line?: string;
}

/**
 * Drives the views with Skia.Context.startProducer: native threads animate
 * the scene, one frame per view per vsync, with no JS, worklet runtime or
 * shared value in the loop. Views register into a slot (index) with their
 * native id; the producer restarts whenever the slots or an option change.
 */
export const useNativeProducer = (
  n: number,
  options: NativeProducerOptions
) => {
  const {
    mode,
    threads,
    fields = null,
    background,
    page,
    cornerRadius = 0,
    present = "main",
    kaleidoscope = false,
    draw = "picture",
    circles = 0,
    radius = 0,
    svg,
    scene = "field",
    bars = 0,
    line,
  } = options;
  const [ids, setIds] = useState<number[]>(() => new Array(n).fill(-1));
  const [stats, setStats] = useState<ProducerStats>({
    batchMs: 0,
    batches: 0,
    threads: 0,
  });

  // Slots follow the view count; the ids of surviving views are kept.
  useEffect(() => {
    setIds((previous) =>
      previous.length === n
        ? previous
        : Array.from({ length: n }, (_, i) => previous[i] ?? -1)
    );
  }, [n]);

  const setId = useCallback((index: number, id: number) => {
    setIds((previous) => {
      if (previous[index] === id) {
        return previous;
      }
      const next = [...previous];
      next[index] = id;
      return next;
    });
  }, []);

  const hasScene = scene === "chart" || (fields !== null && fields.length > 0);
  useEffect(() => {
    if (!hasScene || ids.every((id) => id < 0)) {
      return undefined;
    }
    Skia.Context.startProducer({
      mode,
      threads,
      ids,
      pictures: scene === "chart" ? undefined : (fields ?? undefined),
      background: Skia.Color(background),
      page: page ? Skia.Color(page) : undefined,
      cornerRadius,
      kaleidoscope,
      draw,
      circles,
      radius,
      svg: draw === "svg" ? svg : undefined,
      scene,
      bars,
      line: line ? Skia.Color(line) : undefined,
      present,
    });
    return () => Skia.Context.stopProducer();
  }, [
    background,
    bars,
    circles,
    cornerRadius,
    draw,
    fields,
    hasScene,
    ids,
    kaleidoscope,
    line,
    mode,
    page,
    present,
    radius,
    scene,
    svg,
    threads,
  ]);

  /** Marks which slots the producer should draw (all by default). */
  const setEnabled = useCallback((enabled: boolean[]) => {
    Skia.Context.setProducerEnabled(enabled);
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setStats(Skia.Context.getProducerStats()),
      500
    );
    return () => clearInterval(interval);
  }, []);

  // useContentMeter reads `ids.value`, like a shared value.
  const idsRef = useMemo(() => ({ value: ids }), [ids]);

  return { ids: idsRef, setId, setEnabled, stats };
};
