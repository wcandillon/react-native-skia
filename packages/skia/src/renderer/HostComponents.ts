import { NodeType } from "../dom/types";
import type {
  DeclarationNode,
  FractalNoiseProps,
  RenderNode,
  CircleProps,
  DrawingNodeProps,
  ImageProps,
  PaintProps,
  PathProps,
  LineProps,
  OvalProps,
  DiffRectProps,
  PointsProps,
  RectProps,
  RoundedRectProps,
  TextProps,
  VerticesProps,
  BlurMaskFilterProps,
  BlendImageFilterProps,
  BlurImageFilterProps,
  DisplacementMapImageFilterProps,
  DropShadowImageFilterProps,
  OffsetImageFilterProps,
  RuntimeShaderImageFilterProps,
  MatrixColorFilterProps,
  ShaderProps,
  ImageShaderProps,
  LinearGradientProps,
  GroupProps,
  PatchProps,
  BlendColorFilterProps,
  DashPathEffectProps,
  DiscretePathEffectProps,
  CornerPathEffectProps,
  Line2DPathEffectProps,
  Path1DPathEffectProps,
  Path2DPathEffectProps,
  TextPathProps,
  TextBlobProps,
  GlyphsProps,
  TwoPointConicalGradientProps,
  TurbulenceProps,
  SweepGradientProps,
  RadialGradientProps,
  ColorProps,
  PictureProps,
  ImageSVGProps,
  LerpColorFilterProps,
  BoxProps,
  BoxShadowProps,
  ParagraphProps,
  AtlasProps,
} from "../dom/types";
import type { ChildrenProps } from "../dom/types/Common";
import type {
  BlendProps,
  MorphologyImageFilterProps,
} from "../dom/types/ImageFilters";
import type { SkRect, SkRRect } from "../skia/types";
import type { JsiDrawingNode } from "../dom/nodes/DrawingNode";

import type { Container } from "./Container";
import { exhaustiveCheck } from "./typeddash";
import type { SkiaProps } from "./processors";

// This flag should only be turned on for debugging/testing
const shouldUseJSDomOnNative = true;
export const NATIVE_DOM = shouldUseJSDomOnNative ? false : !!global.SkiaDomApi;

declare global {
  var SkiaDomApi: {
    RectNode: (props: RectProps) => JsiDrawingNode<RectProps, SkRect>;
    RRectNode: (
      props: RoundedRectProps
    ) => JsiDrawingNode<RoundedRectProps, SkRRect>;
    GroupNode: (props: GroupProps) => RenderNode<GroupProps>;
    PaintNode: (props: PaintProps) => DeclarationNode<PaintProps>;
    FillNode: (props: PaintProps) => RenderNode<PaintProps>;
    CircleNode: (props: CircleProps) => RenderNode<CircleProps>;
    PathNode: (props: PathProps) => RenderNode<PathProps>;
    LineNode: (props: LineProps) => RenderNode<LineProps>;
    ImageNode: (props: ImageProps) => RenderNode<ImageProps>;
    OvalNode: (props: OvalProps) => RenderNode<OvalProps>;
    PatchNode: (props: PatchProps) => RenderNode<PatchProps>;
    PointsNode: (props: PointsProps) => RenderNode<PointsProps>;
    DiffRectNode: (props: DiffRectProps) => RenderNode<DiffRectProps>;
    AtlasNode: (props: AtlasProps) => RenderNode<AtlasProps>;

    // Mask filters
    BlurMaskFilterNode: (
      props: BlurMaskFilterProps
    ) => DeclarationNode<BlurMaskFilterProps>;

    // Path effects
    DashPathEffectNode: (
      props: DashPathEffectProps
    ) => DeclarationNode<DashPathEffectProps>;
    DiscretePathEffectNode: (
      props: DiscretePathEffectProps
    ) => DeclarationNode<DiscretePathEffectProps>;
    CornerPathEffectNode: (
      props: CornerPathEffectProps
    ) => DeclarationNode<CornerPathEffectProps>;
    Path1DPathEffectNode: (
      props: Path1DPathEffectProps
    ) => DeclarationNode<Path1DPathEffectProps>;
    Path2DPathEffectNode: (
      props: Path2DPathEffectProps
    ) => DeclarationNode<Path2DPathEffectProps>;
    Line2DPathEffectNode: (
      props: Line2DPathEffectProps
    ) => DeclarationNode<Line2DPathEffectProps>;
    SumPathEffectNode: () => DeclarationNode<null>;

    // Image filters
    BlendImageFilterNode: (
      props: BlendImageFilterProps
    ) => DeclarationNode<BlendImageFilterProps>;
    DropShadowImageFilterNode: (
      props: DropShadowImageFilterProps
    ) => DeclarationNode<DropShadowImageFilterProps>;
    DisplacementMapImageFilterNode: (
      props: DisplacementMapImageFilterProps
    ) => DeclarationNode<DisplacementMapImageFilterProps>;
    BlurImageFilterNode: (
      props: BlurImageFilterProps
    ) => DeclarationNode<BlurImageFilterProps>;
    OffsetImageFilterNode: (
      props: OffsetImageFilterProps
    ) => DeclarationNode<OffsetImageFilterProps>;
    MorphologyImageFilterNode: (
      props: MorphologyImageFilterProps
    ) => DeclarationNode<MorphologyImageFilterProps>;
    RuntimeShaderImageFilterNode: (
      props: RuntimeShaderImageFilterProps
    ) => DeclarationNode<RuntimeShaderImageFilterProps>;

    // Color filters
    MatrixColorFilterNode: (
      props: MatrixColorFilterProps
    ) => DeclarationNode<MatrixColorFilterProps>;
    BlendColorFilterNode: (
      props: BlendColorFilterProps
    ) => DeclarationNode<BlendColorFilterProps>;
    LinearToSRGBGammaColorFilterNode: () => DeclarationNode<null>;
    SRGBToLinearGammaColorFilterNode: () => DeclarationNode<null>;
    LumaColorFilterNode: () => DeclarationNode<null>;
    LerpColorFilterNode: (
      props: LerpColorFilterProps
    ) => DeclarationNode<LerpColorFilterProps>;

    // Shaders
    ShaderNode: (props: ShaderProps) => DeclarationNode<ShaderProps>;
    ImageShaderNode: (
      props: ImageShaderProps
    ) => DeclarationNode<ImageShaderProps>;
    ColorShaderNode: (props: ColorProps) => DeclarationNode<ColorProps>;
    TurbulenceNode: (
      props: TurbulenceProps
    ) => DeclarationNode<TurbulenceProps>;
    FractalNoiseNode: (
      props: FractalNoiseProps
    ) => DeclarationNode<FractalNoiseProps>;
    LinearGradientNode: (
      props: LinearGradientProps
    ) => DeclarationNode<LinearGradientProps>;
    RadialGradientNode: (
      props: RadialGradientProps
    ) => DeclarationNode<RadialGradientProps>;
    SweepGradientNode: (
      props: SweepGradientProps
    ) => DeclarationNode<SweepGradientProps>;
    TwoPointConicalGradientNode: (
      props: TwoPointConicalGradientProps
    ) => DeclarationNode<TwoPointConicalGradientProps>;
    PictureNode: (props: PictureProps) => RenderNode<PictureProps>;
    ImageSVGNode: (props: ImageSVGProps) => RenderNode<ImageSVGProps>;
    VerticesNode: (props: VerticesProps) => RenderNode<VerticesProps>;
    TextNode: (prop: TextProps) => RenderNode<TextProps>;
    TextPathNode: (prop: TextPathProps) => RenderNode<TextPathProps>;
    TextBlobNode: (prop: TextBlobProps) => RenderNode<TextBlobProps>;
    GlyphsNode: (prop: GlyphsProps) => RenderNode<GlyphsProps>;
    BlendNode: (prop: BlendProps) => DeclarationNode<BlendProps>;
    BackdropFilterNode: (prop: ChildrenProps) => RenderNode<ChildrenProps>;
    BoxNode: (prop: BoxProps) => RenderNode<BoxProps>;
    BoxShadowNode: (prop: BoxShadowProps) => DeclarationNode<BoxShadowProps>;
    LayerNode: (prop: ChildrenProps) => RenderNode<ChildrenProps>;

    // Paragraph
    ParagraphNode: (props: ParagraphProps) => RenderNode<ParagraphProps>;
  };

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      skGroup: SkiaProps<GroupProps>;
      skLayer: SkiaProps<ChildrenProps>;
      skPaint: SkiaProps<PaintProps>;

      // Drawings
      skFill: SkiaProps<DrawingNodeProps>;
      skImage: SkiaProps<ImageProps>;
      skCircle: SkiaProps<CircleProps>;
      skPath: SkiaProps<PathProps>;
      skLine: SkiaProps<LineProps>;
      skOval: SkiaProps<OvalProps>;
      skPatch: SkiaProps<PatchProps>;
      skPoints: SkiaProps<PointsProps>;
      skRect: SkiaProps<RectProps>;
      skRRect: SkiaProps<RoundedRectProps>;
      skAtlas: SkiaProps<AtlasProps>;
      skVertices: SkiaProps<VerticesProps>;
      skText: SkiaProps<TextProps>;
      skTextPath: SkiaProps<TextPathProps>;
      skTextBlob: SkiaProps<TextBlobProps>;
      skGlyphs: SkiaProps<GlyphsProps>;
      skDiffRect: SkiaProps<DiffRectProps>;
      skPicture: SkiaProps<PictureProps>;
      skImageSVG: SkiaProps<ImageSVGProps>;

      // BlurMaskFilters
      skBlurMaskFilter: SkiaProps<BlurMaskFilterProps>;

      // ImageFilters
      skBlendImageFilter: SkiaProps<BlendImageFilterProps>;
      skBlurImageFilter: SkiaProps<BlurImageFilterProps>;
      skOffsetImageFilter: SkiaProps<OffsetImageFilterProps>;
      skDropShadowImageFilter: SkiaProps<DropShadowImageFilterProps>;
      skDisplacementMapImageFilter: SkiaProps<DisplacementMapImageFilterProps>;
      skRuntimeShaderImageFilter: SkiaProps<RuntimeShaderImageFilterProps>;
      skMorphologyImageFilter: SkiaProps<MorphologyImageFilterProps>;

      // ColorFilters
      skMatrixColorFilter: SkiaProps<MatrixColorFilterProps>;
      skBlendColorFilter: SkiaProps<BlendColorFilterProps>;
      skLinearToSRGBGammaColorFilter: SkiaProps<ChildrenProps>;
      skSRGBToLinearGammaColorFilter: SkiaProps<ChildrenProps>;
      skLumaColorFilter: SkiaProps<ChildrenProps>;
      skLerpColorFilter: SkiaProps<LerpColorFilterProps>;

      // Shaders
      skShader: SkiaProps<ShaderProps>;
      skImageShader: SkiaProps<ImageShaderProps>;
      skColorShader: SkiaProps<ColorProps>;
      skTurbulence: SkiaProps<TurbulenceProps>;
      skFractalNoise: SkiaProps<FractalNoiseProps>;
      skLinearGradient: SkiaProps<LinearGradientProps>;
      skRadialGradient: SkiaProps<RadialGradientProps>;
      skSweepGradient: SkiaProps<SweepGradientProps>;
      skTwoPointConicalGradient: SkiaProps<TwoPointConicalGradientProps>;

      // Path Effects
      skDiscretePathEffect: SkiaProps<DiscretePathEffectProps>;
      skDashPathEffect: SkiaProps<DashPathEffectProps>;
      skPath1DPathEffect: SkiaProps<Path1DPathEffectProps>;
      skPath2DPathEffect: SkiaProps<Path2DPathEffectProps>;
      skCornerPathEffect: SkiaProps<CornerPathEffectProps>;
      skSumPathEffect: ChildrenProps;
      skLine2DPathEffect: SkiaProps<Line2DPathEffectProps>;

      // Mixed declarations/drawings
      skBlend: SkiaProps<BlendProps>;
      skBackdropFilter: SkiaProps<ChildrenProps>;
      skBox: SkiaProps<BoxProps>;
      skBoxShadow: SkiaProps<BoxShadowProps>;

      // Paragraph
      skParagraph: SkiaProps<ParagraphProps>;
    }
  }
}

export const createNode = (
  container: Container,
  type: NodeType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
) => {
  const { Sk } = container;
  switch (type) {
    case NodeType.Layer:
      return Sk.Layer(props);
    case NodeType.Group:
      return Sk.Group(props);
    case NodeType.Paint:
      return Sk.Paint(props);
    // Drawings
    case NodeType.Fill:
      return Sk.Fill(props);
    case NodeType.Image:
      return Sk.Image(props);
    case NodeType.Circle:
      return Sk.Circle(props);
    case NodeType.Path:
      return Sk.Path(props);
    case NodeType.Line:
      return Sk.Line(props);
    case NodeType.Oval:
      return Sk.Oval(props);
    case NodeType.Patch:
      return Sk.Patch(props);
    case NodeType.Points:
      return Sk.Points(props);
    case NodeType.Rect:
      return Sk.Rect(props);
    case NodeType.RRect:
      return Sk.RRect(props);
    case NodeType.Vertices:
      return Sk.Vertices(props);
    case NodeType.Text:
      return Sk.Text(props);
    case NodeType.TextPath:
      return Sk.TextPath(props);
    case NodeType.TextBlob:
      return Sk.TextBlob(props);
    case NodeType.Glyphs:
      return Sk.Glyphs(props);
    case NodeType.Atlas:
      return Sk.Atlas(props);
    case NodeType.DiffRect:
      return Sk.DiffRect(props);
    case NodeType.Picture:
      return Sk.Picture(props);
    case NodeType.ImageSVG:
      return Sk.ImageSVG(props);
    // Mask Filter
    case NodeType.BlurMaskFilter:
      return Sk.BlurMaskFilter(props);
    // Image Filter
    case NodeType.BlendImageFilter:
      return Sk.BlendImageFilter(props);
    case NodeType.BlurImageFilter:
      return Sk.BlurImageFilter(props);
    case NodeType.OffsetImageFilter:
      return Sk.OffsetImageFilter(props);
    case NodeType.DropShadowImageFilter:
      return Sk.DropShadowImageFilter(props);
    case NodeType.DisplacementMapImageFilter:
      return Sk.DisplacementMapImageFilter(props);
    case NodeType.MorphologyImageFilter:
      return Sk.MorphologyImageFilter(props);
    case NodeType.RuntimeShaderImageFilter:
      return Sk.RuntimeShaderImageFilter(props);
    // Color Filter
    case NodeType.MatrixColorFilter:
      return Sk.MatrixColorFilter(props);
    case NodeType.BlendColorFilter:
      return Sk.BlendColorFilter(props);
    case NodeType.LerpColorFilter:
      return Sk.LerpColorFilter(props);
    case NodeType.LumaColorFilter:
      return Sk.LumaColorFilter();
    case NodeType.LinearToSRGBGammaColorFilter:
      return Sk.LinearToSRGBGammaColorFilter();
    case NodeType.SRGBToLinearGammaColorFilter:
      return Sk.SRGBToLinearGammaColorFilter();
    // Shader
    case NodeType.Shader:
      return Sk.Shader(props);
    case NodeType.ImageShader:
      return Sk.ImageShader(props);
    case NodeType.ColorShader:
      return Sk.ColorShader(props);
    case NodeType.Turbulence:
      return Sk.Turbulence(props);
    case NodeType.FractalNoise:
      return Sk.FractalNoise(props);
    case NodeType.LinearGradient:
      return Sk.LinearGradient(props);
    case NodeType.RadialGradient:
      return Sk.RadialGradient(props);
    case NodeType.SweepGradient:
      return Sk.SweepGradient(props);
    case NodeType.TwoPointConicalGradient:
      return Sk.TwoPointConicalGradient(props);
    // Path Effect
    case NodeType.CornerPathEffect:
      return Sk.CornerPathEffect(props);
    case NodeType.DiscretePathEffect:
      return Sk.DiscretePathEffect(props);
    case NodeType.DashPathEffect:
      return Sk.DashPathEffect(props);
    case NodeType.Path1DPathEffect:
      return Sk.Path1DPathEffect(props);
    case NodeType.Path2DPathEffect:
      return Sk.Path2DPathEffect(props);
    case NodeType.SumPathEffect:
      return Sk.SumPathEffect();
    case NodeType.Line2DPathEffect:
      return Sk.Line2DPathEffect(props);
    // Mixed
    case NodeType.Blend:
      return Sk.Blend(props);
    case NodeType.BackdropFilter:
      return Sk.BackdropFilter(props);
    case NodeType.Box:
      return Sk.Box(props);
    case NodeType.BoxShadow:
      return Sk.BoxShadow(props);
    // Paragraph
    case NodeType.Paragraph:
      return Sk.Paragraph(props);
    default:
      return exhaustiveCheck(type);
  }
};
