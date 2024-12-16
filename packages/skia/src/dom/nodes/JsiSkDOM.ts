import type {
  PathProps,
  SkDOM,
  GroupProps,
  ImageProps,
  BlurImageFilterProps,
  MatrixColorFilterProps,
  CircleProps,
  BlurMaskFilterProps,
  LinearGradientProps,
  PaintProps,
  ShaderProps,
  ImageShaderProps,
  LineProps,
  OvalProps,
  PatchProps,
  PointsProps,
  RectProps,
  RoundedRectProps,
  VerticesProps,
  TextProps,
  DiffRectProps,
  OffsetImageFilterProps,
  BlendColorFilterProps,
  TextPathProps,
  TextBlobProps,
  GlyphsProps,
  TwoPointConicalGradientProps,
  TurbulenceProps,
  SweepGradientProps,
  RadialGradientProps,
  FractalNoiseProps,
  ColorProps,
  PictureProps,
  ImageSVGProps,
  LerpColorFilterProps,
  DrawingNodeProps,
  BoxProps,
  BoxShadowProps,
  ChildrenProps,
  AtlasProps,
} from "../types";
import type {
  BlendImageFilterProps,
  BlendProps,
  DisplacementMapImageFilterProps,
  DropShadowImageFilterProps,
  MorphologyImageFilterProps,
  RuntimeShaderImageFilterProps,
} from "../types/ImageFilters";
import type {
  CornerPathEffectProps,
  DashPathEffectProps,
  DiscretePathEffectProps,
  Line2DPathEffectProps,
  Path1DPathEffectProps,
  Path2DPathEffectProps,
} from "../types/PathEffects";
import type { ParagraphProps } from "../types/Paragraph";

import {
  FillNode,
  ImageNode,
  CircleNode,
  PathNode,
  LineNode,
  PatchNode,
  PointsNode,
  RectNode,
  RRectNode,
  VerticesNode,
  TextNode,
  OvalNode,
  TextPathNode,
  TextBlobNode,
  GlyphsNode,
  DiffRectNode,
  PictureNode,
  ImageSVGNode,
  BackdropFilterNode,
  BoxNode,
  BoxShadowNode,
  AtlasNode,
} from "./drawings";
import {
  BlendImageFilterNode,
  BlurImageFilterNode,
  BlurMaskFilterNode,
  DisplacementMapImageFilterNode,
  DropShadowImageFilterNode,
  OffsetImageFilterNode,
  RuntimeShaderImageFilterNode,
  CornerPathEffectNode,
  DiscretePathEffectNode,
  DashPathEffectNode,
  Path1DPathEffectNode,
  Path2DPathEffectNode,
  SumPathEffectNode,
  Line2DPathEffectNode,
  BlendNode,
} from "./paint";
import {
  MatrixColorFilterNode,
  LumaColorFilterNode,
  LinearToSRGBGammaColorFilterNode,
  SRGBToLinearGammaColorFilterNode,
  BlendColorFilterNode,
  LerpColorFilterNode,
} from "./paint/ColorFilters";
import {
  LinearGradientNode,
  ShaderNode,
  ImageShaderNode,
  TwoPointConicalGradientNode,
  TurbulenceNode,
  SweepGradientNode,
  RadialGradientNode,
  FractalNoiseNode,
  ColorNode,
} from "./paint/Shaders";
import { MorphologyImageFilterNode } from "./paint/ImageFilters";
import { GroupNode } from "./GroupNode";
import { PaintNode } from "./PaintNode";
import type { NodeContext } from "./Node";
import { LayerNode } from "./LayerNode";
import { ParagraphNode } from "./drawings/ParagraphNode";

export class JsiSkDOM implements SkDOM {
  constructor(private ctx: NodeContext, private native: boolean) {}

  Layer(props?: ChildrenProps) {
    return this.native
      ? global.SkiaDomApi.LayerNode(props ?? {})
      : new LayerNode(this.ctx, props ?? {});
  }

  Group(props?: GroupProps) {
    return this.native
      ? global.SkiaDomApi.GroupNode(props ?? {})
      : new GroupNode(this.ctx, props ?? {});
  }

  Paint(props: PaintProps) {
    return this.native
      ? global.SkiaDomApi.PaintNode(props ?? {})
      : new PaintNode(this.ctx, props);
  }

  // Drawings
  Fill(props?: DrawingNodeProps) {
    return this.native
      ? global.SkiaDomApi.FillNode(props ?? {})
      : new FillNode(this.ctx, props);
  }

  Image(props: ImageProps) {
    return this.native
      ? global.SkiaDomApi.ImageNode(props ?? {})
      : new ImageNode(this.ctx, props);
  }

  Circle(props: CircleProps) {
    return this.native
      ? global.SkiaDomApi.CircleNode(props ?? {})
      : new CircleNode(this.ctx, props);
  }

  Path(props: PathProps) {
    return this.native
      ? global.SkiaDomApi.PathNode(props ?? {})
      : new PathNode(this.ctx, props);
  }

  Line(props: LineProps) {
    return this.native
      ? global.SkiaDomApi.LineNode(props ?? {})
      : new LineNode(this.ctx, props);
  }

  Oval(props: OvalProps) {
    return this.native
      ? global.SkiaDomApi.OvalNode(props ?? {})
      : new OvalNode(this.ctx, props);
  }

  Patch(props: PatchProps) {
    return this.native
      ? global.SkiaDomApi.PatchNode(props ?? {})
      : new PatchNode(this.ctx, props);
  }

  Points(props: PointsProps) {
    return this.native
      ? global.SkiaDomApi.PointsNode(props ?? {})
      : new PointsNode(this.ctx, props);
  }

  Rect(props: RectProps) {
    return this.native
      ? global.SkiaDomApi.RectNode(props)
      : new RectNode(this.ctx, props);
  }

  RRect(props: RoundedRectProps) {
    return this.native
      ? global.SkiaDomApi.RRectNode(props)
      : new RRectNode(this.ctx, props);
  }

  Vertices(props: VerticesProps) {
    return this.native
      ? global.SkiaDomApi.VerticesNode(props)
      : new VerticesNode(this.ctx, props);
  }

  Text(props: TextProps) {
    return this.native
      ? global.SkiaDomApi.TextNode(props)
      : new TextNode(this.ctx, props);
  }

  TextPath(props: TextPathProps) {
    return this.native
      ? global.SkiaDomApi.TextPathNode(props)
      : new TextPathNode(this.ctx, props);
  }

  TextBlob(props: TextBlobProps) {
    return this.native
      ? global.SkiaDomApi.TextBlobNode(props)
      : new TextBlobNode(this.ctx, props);
  }

  Glyphs(props: GlyphsProps) {
    return this.native
      ? global.SkiaDomApi.GlyphsNode(props)
      : new GlyphsNode(this.ctx, props);
  }

  DiffRect(props: DiffRectProps) {
    return this.native
      ? global.SkiaDomApi.DiffRectNode(props)
      : new DiffRectNode(this.ctx, props);
  }

  Picture(props: PictureProps) {
    return this.native
      ? global.SkiaDomApi.PictureNode(props)
      : new PictureNode(this.ctx, props);
  }

  Atlas(props: AtlasProps) {
    return this.native
      ? global.SkiaDomApi.AtlasNode(props)
      : new AtlasNode(this.ctx, props);
  }

  ImageSVG(props: ImageSVGProps) {
    return this.native
      ? global.SkiaDomApi.ImageSVGNode(props)
      : new ImageSVGNode(this.ctx, props);
  }

  // BlurMaskFilters
  BlurMaskFilter(props: BlurMaskFilterProps) {
    return this.native
      ? global.SkiaDomApi.BlurMaskFilterNode(props)
      : new BlurMaskFilterNode(this.ctx, props);
  }

  // ImageFilters
  BlendImageFilter(props: BlendImageFilterProps) {
    return this.native
      ? global.SkiaDomApi.BlendImageFilterNode(props)
      : new BlendImageFilterNode(this.ctx, props);
  }

  DropShadowImageFilter(props: DropShadowImageFilterProps) {
    return this.native
      ? global.SkiaDomApi.DropShadowImageFilterNode(props)
      : new DropShadowImageFilterNode(this.ctx, props);
  }

  DisplacementMapImageFilter(props: DisplacementMapImageFilterProps) {
    return this.native
      ? global.SkiaDomApi.DisplacementMapImageFilterNode(props)
      : new DisplacementMapImageFilterNode(this.ctx, props);
  }

  BlurImageFilter(props: BlurImageFilterProps) {
    return this.native
      ? global.SkiaDomApi.BlurImageFilterNode(props)
      : new BlurImageFilterNode(this.ctx, props);
  }

  OffsetImageFilter(props: OffsetImageFilterProps) {
    return this.native
      ? global.SkiaDomApi.OffsetImageFilterNode(props)
      : new OffsetImageFilterNode(this.ctx, props);
  }

  MorphologyImageFilter(props: MorphologyImageFilterProps) {
    return this.native
      ? global.SkiaDomApi.MorphologyImageFilterNode(props)
      : new MorphologyImageFilterNode(this.ctx, props);
  }

  RuntimeShaderImageFilter(props: RuntimeShaderImageFilterProps) {
    return this.native
      ? global.SkiaDomApi.RuntimeShaderImageFilterNode(props)
      : new RuntimeShaderImageFilterNode(this.ctx, props);
  }

  // Color Filters
  MatrixColorFilter(props: MatrixColorFilterProps) {
    return this.native
      ? global.SkiaDomApi.MatrixColorFilterNode(props)
      : new MatrixColorFilterNode(this.ctx, props);
  }

  BlendColorFilter(props: BlendColorFilterProps) {
    return this.native
      ? global.SkiaDomApi.BlendColorFilterNode(props)
      : new BlendColorFilterNode(this.ctx, props);
  }

  LumaColorFilter() {
    return this.native
      ? global.SkiaDomApi.LumaColorFilterNode()
      : new LumaColorFilterNode(this.ctx);
  }

  LinearToSRGBGammaColorFilter() {
    return this.native
      ? global.SkiaDomApi.LinearToSRGBGammaColorFilterNode()
      : new LinearToSRGBGammaColorFilterNode(this.ctx);
  }

  SRGBToLinearGammaColorFilter() {
    return this.native
      ? global.SkiaDomApi.SRGBToLinearGammaColorFilterNode()
      : new SRGBToLinearGammaColorFilterNode(this.ctx);
  }

  LerpColorFilter(props: LerpColorFilterProps) {
    return this.native
      ? global.SkiaDomApi.LerpColorFilterNode(props)
      : new LerpColorFilterNode(this.ctx, props);
  }

  // Shaders
  Shader(props: ShaderProps) {
    return this.native
      ? global.SkiaDomApi.ShaderNode(props)
      : new ShaderNode(this.ctx, props);
  }

  ImageShader(props: ImageShaderProps) {
    return this.native
      ? global.SkiaDomApi.ImageShaderNode(props)
      : new ImageShaderNode(this.ctx, props);
  }

  ColorShader(props: ColorProps) {
    return this.native
      ? global.SkiaDomApi.ColorShaderNode(props)
      : new ColorNode(this.ctx, props);
  }

  SweepGradient(props: SweepGradientProps) {
    return this.native
      ? global.SkiaDomApi.SweepGradientNode(props)
      : new SweepGradientNode(this.ctx, props);
  }

  Turbulence(props: TurbulenceProps) {
    return this.native
      ? global.SkiaDomApi.TurbulenceNode(props)
      : new TurbulenceNode(this.ctx, props);
  }

  FractalNoise(props: FractalNoiseProps) {
    return this.native
      ? global.SkiaDomApi.FractalNoiseNode(props)
      : new FractalNoiseNode(this.ctx, props);
  }

  LinearGradient(props: LinearGradientProps) {
    return this.native
      ? global.SkiaDomApi.LinearGradientNode(props)
      : new LinearGradientNode(this.ctx, props);
  }

  RadialGradient(props: RadialGradientProps) {
    return this.native
      ? global.SkiaDomApi.RadialGradientNode(props)
      : new RadialGradientNode(this.ctx, props);
  }

  TwoPointConicalGradient(props: TwoPointConicalGradientProps) {
    return this.native
      ? global.SkiaDomApi.TwoPointConicalGradientNode(props)
      : new TwoPointConicalGradientNode(this.ctx, props);
  }

  // Path Effects
  CornerPathEffect(props: CornerPathEffectProps) {
    return this.native
      ? global.SkiaDomApi.CornerPathEffectNode(props)
      : new CornerPathEffectNode(this.ctx, props);
  }

  DiscretePathEffect(props: DiscretePathEffectProps) {
    return this.native
      ? global.SkiaDomApi.DiscretePathEffectNode(props)
      : new DiscretePathEffectNode(this.ctx, props);
  }

  DashPathEffect(props: DashPathEffectProps) {
    return this.native
      ? global.SkiaDomApi.DashPathEffectNode(props)
      : new DashPathEffectNode(this.ctx, props);
  }

  Path1DPathEffect(props: Path1DPathEffectProps) {
    return this.native
      ? global.SkiaDomApi.Path1DPathEffectNode(props)
      : new Path1DPathEffectNode(this.ctx, props);
  }

  Path2DPathEffect(props: Path2DPathEffectProps) {
    return this.native
      ? global.SkiaDomApi.Path2DPathEffectNode(props)
      : new Path2DPathEffectNode(this.ctx, props);
  }

  SumPathEffect() {
    return this.native
      ? global.SkiaDomApi.SumPathEffectNode()
      : new SumPathEffectNode(this.ctx);
  }

  Line2DPathEffect(props: Line2DPathEffectProps) {
    return this.native
      ? global.SkiaDomApi.Line2DPathEffectNode(props)
      : new Line2DPathEffectNode(this.ctx, props);
  }

  Blend(props: BlendProps) {
    return this.native
      ? global.SkiaDomApi.BlendNode(props)
      : new BlendNode(this.ctx, props);
  }

  BackdropFilter(props: ChildrenProps) {
    return this.native
      ? global.SkiaDomApi.BackdropFilterNode(props)
      : new BackdropFilterNode(this.ctx, props);
  }

  Box(props: BoxProps) {
    return this.native
      ? global.SkiaDomApi.BoxNode(props)
      : new BoxNode(this.ctx, props);
  }

  BoxShadow(props: BoxShadowProps) {
    return this.native
      ? global.SkiaDomApi.BoxShadowNode(props)
      : new BoxShadowNode(this.ctx, props);
  }

  // Paragraph
  Paragraph(props: ParagraphProps) {
    return this.native
      ? global.SkiaDomApi.ParagraphNode(props)
      : new ParagraphNode(this.ctx, props);
  }
}
