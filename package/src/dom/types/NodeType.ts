export const enum NodeType {
  // Shaders
  Shader = "skShader",
  ImageShader = "skImageShader",
  ColorShader = "skColorShader",
  Turbulence = "skTurbulence",
  FractalNoise = "skFractalNoise",
  LinearGradient = "skLinearGradient",
  RadialGradient = "skRadialGradient",
  SweepGradient = "skSweepGradient",
  TwoPointConicalGradient = "skTwoPointConicalGradient",

  // Mask Filters
  BlurMaskFilter = "skBlurMaskFilter",

  // Path Effects
  DiscretePathEffect = "skDiscretePathEffect",
  DashPathEffect = "skDashPathEffect",
  Path1DPathEffect = "skPath1DPathEffect",
  Path2DPathEffect = "skPath2DPathEffect",
  CornerPathEffect = "skCornerPathEffect",
  SumPathEffect = "skSumPathEffect",
  Line2DPathEffect = "skLine2DPathEffect",

  // Color Filters
  MatrixColorFilter = "skMatrixColorFilter",
  BlendColorFilter = "skBlendColorFilter",
  LinearToSRGBGammaColorFilter = "skLinearToSRGBGammaColorFilter",
  SRGBToLinearGammaColorFilter = "skSRGBToLinearGammaColorFilter",
  LumaColorFilter = "skLumaColorFilter",
  LerpColorFilter = "skLerpColorFilter",

  // Image Filters
  OffsetImageFilter = "skOffsetImageFilter",
  DisplacementMapImageFilter = "skDisplacementMapImageFilter",
  BlurImageFilter = "skBlurImageFilter",
  DropShadowImageFilter = "skDropShadowImageFilter",
  MorphologyImageFilter = "skMorphologyImageFilter",
  BlendImageFilter = "skBlendImageFilter",
  RuntimeShaderImageFilter = "skRuntimeShaderImageFilter",

  // Mixed
  Blend = "skBlend",
  BackdropFilter = "skBackdropFilter",
  Box = "skBox",
  BoxShadow = "skBoxShadow",

  // Drawings
  Group = "skGroup",
  Drawing = "skDrawing",
  Paint = "skPaint",
  Circle = "skCircle",
  Fill = "skFill",
  Image = "skImage",
  Points = "skPoints",
  Path = "skPath",
  Rect = "skRect",
  RRect = "skRRect",
  Oval = "skOval",
  Line = "skLine",
  Patch = "skPatch",
  Vertices = "skVertices",
  DiffRect = "skDiffRect",
  Text = "skText",
  TextPath = "skTextPath",
  TextBlob = "skTextBlob",
  Glyphs = "skGlyphs",
  Picture = "skPicture",
  ImageSVG = "skImageSVG",
}

export const enum DeclarationType {
  Paint,
  Shader,
  ImageFilter,
  ColorFilter,
  PathEffect,
  MaskFilter,
  Unknown,
}
