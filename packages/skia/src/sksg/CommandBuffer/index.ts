import { CommandBufferCanvas } from "./Canvas";
import { Compiler, PaintCache, affineOf } from "./Compiler";
import { CommandBufferContainer } from "./Container";
import { CommandOp, getExperimentalApi } from "./Experimental";

export type {
  CommandBufferCanvasProps,
  CommandBufferCanvasRef,
} from "./Canvas";
export type { Binding, Compilation } from "./Compiler";
export type {
  CommandBufferCommit,
  CommandBufferContainerOptions,
} from "./Container";
export type {
  ExperimentalApi,
  ExperimentalCommandBuffer,
} from "./Experimental";

/**
 * Experimental, not part of the public API: the allocation free drawing path
 * of the recorder benchmark (apps/docs/docs/_recorder-benchmark.md). Native
 * only. It may change or go away without notice.
 */
export const __experimental = {
  CommandBufferCanvas,
  CommandBufferContainer,
  Compiler,
  PaintCache,
  CommandOp,
  affineOf,
  getExperimentalApi,
};
