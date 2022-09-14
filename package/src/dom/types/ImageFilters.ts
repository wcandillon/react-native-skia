import type {
  BlendMode,
  Color,
  ColorChannel,
  SkRuntimeEffect,
  TileMode,
  Uniforms,
} from "../../skia/types";

import type { Radius, SkEnum, ChildrenProps } from "./Common";

export interface BlurImageFilterProps extends ChildrenProps {
  blur: Radius;
  mode: SkEnum<typeof TileMode>;
}

export interface OffsetImageFilterProps extends ChildrenProps {
  x: number;
  y: number;
}

export interface RuntimeShaderImageFilterProps extends ChildrenProps {
  source: SkRuntimeEffect;
  uniforms?: Uniforms;
}

export interface BlendImageFilterProps extends ChildrenProps {
  mode: BlendMode;
}

export interface MorphologyImageFilterProps extends ChildrenProps {
  operator: "erode" | "dilate";
  radius: Radius;
}

export interface DropShadowImageFilterProps extends ChildrenProps {
  dx: number;
  dy: number;
  blur: number;
  color: Color;
  inner?: boolean;
  shadowOnly?: boolean;
}

export interface DisplacementMapImageFilterProps extends ChildrenProps {
  channelX: SkEnum<typeof ColorChannel>;
  channelY: SkEnum<typeof ColorChannel>;
  scale: number;
}

export interface BlendProps extends ChildrenProps {
  mode: SkEnum<typeof BlendMode>;
}
