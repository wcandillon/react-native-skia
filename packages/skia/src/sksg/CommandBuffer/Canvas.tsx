import React, {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { ReactNode } from "react";
import type { ViewProps } from "react-native";

import { SkiaViewApi } from "../../views/api";
import SkiaViewNativeComponent from "../../specs/SkiaViewNativeComponent";
import { SkiaSGRoot } from "../Reconciler";
import { Skia } from "../../skia";

import { CommandBufferContainer } from "./Container";
import type {
  CommandBufferCommit,
  CommandBufferContainerOptions,
} from "./Container";

export interface CommandBufferCanvasRef {
  getNativeId(): number;
}

export interface CommandBufferCanvasProps extends ViewProps {
  children?: ReactNode;
  /** Interpret the buffer on every frame, or draw it as a picture. */
  mode: CommandBufferContainerOptions["mode"];
  /** Called after every commit with what it cost. */
  onCommit?: (commit: CommandBufferCommit) => void;
  /** A timer name for the mapper's time, see __RNSkiaRecorderStats. */
  mapperTimer?: string;
  ref?: React.Ref<CommandBufferCanvasRef>;
}

/**
 * Experimental: a canvas whose scene graph is compiled in TypeScript into a
 * command buffer (see Compiler.ts) instead of being recorded into the native
 * recorder. Native only, for the recorder benchmark.
 */
export const CommandBufferCanvas = ({
  children,
  mode,
  onCommit,
  mapperTimer,
  ref,
  ...viewProps
}: CommandBufferCanvasProps) => {
  const nativeId = useMemo(() => SkiaViewApi.allocateNativeId(), []);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const root = useMemo(
    () =>
      new SkiaSGRoot(
        Skia,
        nativeId,
        (skia, id) =>
          new CommandBufferContainer(skia, id, {
            mode,
            mapperTimer,
            onCommit: (commit) => onCommitRef.current?.(commit),
          })
      ),
    [nativeId, mode, mapperTimer]
  );
  useLayoutEffect(() => {
    root.render(children);
  }, [children, root]);
  useEffect(() => {
    return () => {
      root.unmount();
    };
  }, [root]);
  useImperativeHandle(ref, () => ({ getNativeId: () => nativeId }), [nativeId]);
  return (
    <SkiaViewNativeComponent
      collapsable={false}
      nativeID={`${nativeId}`}
      highBitDepth={false}
      colorSpace=""
      {...viewProps}
    />
  );
};
