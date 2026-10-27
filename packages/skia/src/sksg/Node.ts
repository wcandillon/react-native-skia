import { NodeType } from "../dom/types";

export interface Node<Props = unknown> {
  type: NodeType;
  props: Props;
  children: Node[];
}

export const isColorFilter = (type: NodeType) => {
  "worklet";
  return (
    type === NodeType.BlendColorFilter ||
    type === NodeType.MatrixColorFilter ||
    type === NodeType.LerpColorFilter ||
    type === NodeType.LumaColorFilter ||
    type === NodeType.SRGBToLinearGammaColorFilter ||
    type === NodeType.LinearToSRGBGammaColorFilter
  );
};

export const isPathEffect = (type: NodeType) => {
  "worklet";
  return (
    type === NodeType.DiscretePathEffect ||
    type === NodeType.DashPathEffect ||
    type === NodeType.Path1DPathEffect ||
    type === NodeType.Path2DPathEffect ||
    type === NodeType.CornerPathEffect ||
    type === NodeType.SumPathEffect ||
    type === NodeType.Line2DPathEffect
  );
};

export const isImageFilter = (type: NodeType) => {
  "worklet";
  return (
    type === NodeType.ImageFilter ||
    type === NodeType.OffsetImageFilter ||
    type === NodeType.DisplacementMapImageFilter ||
    type === NodeType.BlurImageFilter ||
    type === NodeType.DropShadowImageFilter ||
    type === NodeType.MorphologyImageFilter ||
    type === NodeType.BlendImageFilter ||
    type === NodeType.RuntimeShaderImageFilter
  );
};

export const isShader = (type: NodeType) => {
  "worklet";
  return (
    type === NodeType.Shader ||
    type === NodeType.ImageShader ||
    type === NodeType.ColorShader ||
    type === NodeType.Turbulence ||
    type === NodeType.FractalNoise ||
    type === NodeType.LinearGradient ||
    type === NodeType.RadialGradient ||
    type === NodeType.SweepGradient ||
    type === NodeType.TwoPointConicalGradient
  );
};

/**
 * The type a node records as. A <Blend> is an image filter when it blends
 * image filters and a shader otherwise; the scene graph keeps the type React
 * gave it, the tree is never written to while it is visited.
 */
export const resolveType = (node: Node): NodeType => {
  "worklet";
  if (node.type !== NodeType.Blend) {
    return node.type;
  }
  // Iterative on purpose: a worklet cannot call itself by name. A <Blend>
  // nested as the first child decides like its parent would.
  let first = node.children[0];
  while (first && first.type === NodeType.Blend) {
    first = first.children[0];
  }
  return first && isImageFilter(first.type)
    ? NodeType.BlendImageFilter
    : NodeType.Blend;
};

export const sortNodeChildren = (parent: Node) => {
  "worklet";
  const maskFilters: Node[] = [];
  const colorFilters: Node[] = [];
  const shaders: Node[] = [];
  const imageFilters: Node[] = [];
  const pathEffects: Node[] = [];
  const drawings: Node[] = [];
  const paints: Node[] = [];
  parent.children.forEach((node) => {
    const type = resolveType(node);
    if (isColorFilter(type)) {
      colorFilters.push(node);
    } else if (type === NodeType.BlurMaskFilter) {
      maskFilters.push(node);
    } else if (isPathEffect(type)) {
      pathEffects.push(node);
    } else if (isImageFilter(type)) {
      imageFilters.push(node);
    } else if (isShader(type)) {
      shaders.push(node);
    } else if (type === NodeType.Paint) {
      paints.push(node);
    } else if (type === NodeType.Blend) {
      shaders.push(node);
    } else {
      drawings.push(node);
    }
  });
  return {
    colorFilters,
    drawings,
    maskFilters,
    shaders,
    pathEffects,
    imageFilters,
    paints,
  };
};
