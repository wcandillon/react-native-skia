import type { SkFont } from "../../skia/types";

export type FontDef = { font: SkFont };

export const isFont = (fontDef: FontDef): fontDef is { font: SkFont } =>
  // We have an issue to check property existence on JSI backed instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fontDef as any).font !== undefined;
