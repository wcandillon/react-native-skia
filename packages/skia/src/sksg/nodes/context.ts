/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeType } from "../../dom/types";
import type { DrawingNodeProps } from "../../dom/types";
import type { DrawingContext } from "../DrawingContext";
import type { SkImageFilter } from "../../skia/types";
import {
  createDeclarationContext,
  type DeclarationContext,
} from "../DeclarationContext";

import type { Node } from "./Node";
import {
  drawAtlas,
  drawBox,
  drawCircle,
  drawDiffRect,
  drawFill,
  drawGlyphs,
  drawImage,
  drawImageSVG,
  drawLine,
  drawOval,
  drawParagraph,
  drawPatch,
  drawPath,
  drawPicture,
  drawPoints,
  drawRect,
  drawRRect,
  drawText,
  drawTextBlob,
  drawTextPath,
  drawVertices,
} from "./drawings";
import {
  composeColorFilters,
  declareLerpColorFilter,
  makeBlendColorFilter,
  makeLinearToSRGBGammaColorFilter,
  makeLumaColorFilter,
  makeMatrixColorFilter,
  makeSRGBToLinearGammaColorFilter,
} from "./colorFilters";
import {
  composeImageFilters,
  declareBlend,
  declareBlendImageFilter,
  declareBlurMaskFilter,
  declareDisplacementMapImageFilter,
  makeBlurImageFilter,
  makeDropShadowImageFilter,
  makeMorphologyImageFilter,
  makeOffsetImageFilter,
  makeRuntimeShaderImageFilter,
} from "./imageFilters";
import { materialize } from "./utils";
import {
  declareColorShader,
  declareFractalNoiseShader,
  declareImageShader,
  declareLinearGradientShader,
  declareRadialGradientShader,
  declareShader,
  declareSweepGradientShader,
  declareTurbulenceShader,
  declareTwoPointConicalGradientShader,
} from "./shaders";
import { declarePaint } from "./paint";
import {
  composePathEffects,
  declareSumPathEffect,
  makeCornerPathEffect,
  makeDashPathEffect,
  makeDiscretePathEffect,
  makeLine2DPathEffect,
  makePath1DPathEffect,
  makePath2DPathEffect,
} from "./pathEffects";

function processDeclarations(ctx: DeclarationContext, node: Node<any>) {
  "worklet";
  const processChildren = () =>
    node.children.forEach((child) => processDeclarations(ctx, child));
  const { type } = node;
  materialize(node);
  const { props } = node;
  switch (type) {
    // Mask Filter
    case NodeType.BlurMaskFilter: {
      declareBlurMaskFilter(ctx, props);
      break;
    }
    // Color Filters
    case NodeType.LerpColorFilter: {
      processChildren();
      declareLerpColorFilter(ctx, props);
      break;
    }
    case NodeType.Blend: {
      processChildren();
      declareBlend(ctx, props);
      break;
    }
    case NodeType.BlendColorFilter: {
      const cf = makeBlendColorFilter(ctx, props);
      composeColorFilters(ctx, cf, processChildren);
      break;
    }
    case NodeType.SRGBToLinearGammaColorFilter: {
      const cf = makeSRGBToLinearGammaColorFilter(ctx);
      composeColorFilters(ctx, cf, processChildren);
      break;
    }
    case NodeType.LinearToSRGBGammaColorFilter: {
      const cf = makeLinearToSRGBGammaColorFilter(ctx);
      composeColorFilters(ctx, cf, processChildren);
      break;
    }
    case NodeType.MatrixColorFilter: {
      const cf = makeMatrixColorFilter(ctx, props);
      composeColorFilters(ctx, cf, processChildren);
      break;
    }
    case NodeType.LumaColorFilter: {
      const cf = makeLumaColorFilter(ctx);
      composeColorFilters(ctx, cf, processChildren);
      break;
    }
    // Shaders
    case NodeType.Shader: {
      processChildren();
      declareShader(ctx, props);
      break;
    }
    case NodeType.ImageShader: {
      declareImageShader(ctx, props);
      break;
    }
    case NodeType.ColorShader: {
      declareColorShader(ctx, props);
      break;
    }
    case NodeType.Turbulence: {
      declareTurbulenceShader(ctx, props);
      break;
    }
    case NodeType.FractalNoise: {
      declareFractalNoiseShader(ctx, props);
      break;
    }
    case NodeType.LinearGradient: {
      declareLinearGradientShader(ctx, props);
      break;
    }
    case NodeType.RadialGradient: {
      declareRadialGradientShader(ctx, props);
      break;
    }
    case NodeType.SweepGradient: {
      declareSweepGradientShader(ctx, props);
      break;
    }
    case NodeType.TwoPointConicalGradient: {
      declareTwoPointConicalGradientShader(ctx, props);
      break;
    }
    // Image Filters
    case NodeType.BlurImageFilter: {
      const imgf = makeBlurImageFilter(ctx, props);
      composeImageFilters(ctx, imgf, processChildren);
      break;
    }
    case NodeType.OffsetImageFilter: {
      const imgf = makeOffsetImageFilter(ctx, props);
      composeImageFilters(ctx, imgf, processChildren);
      break;
    }
    case NodeType.DisplacementMapImageFilter: {
      processChildren();
      declareDisplacementMapImageFilter(ctx, props);
      break;
    }
    case NodeType.DropShadowImageFilter: {
      const imgf = makeDropShadowImageFilter(ctx, props);
      composeImageFilters(ctx, imgf, processChildren);
      break;
    }
    case NodeType.MorphologyImageFilter: {
      const imgf = makeMorphologyImageFilter(ctx, props);
      composeImageFilters(ctx, imgf, processChildren);
      break;
    }
    case NodeType.BlendImageFilter: {
      processChildren();
      declareBlendImageFilter(ctx, props);
      break;
    }
    case NodeType.RuntimeShaderImageFilter: {
      const imgf = makeRuntimeShaderImageFilter(ctx, props);
      composeImageFilters(ctx, imgf, processChildren);
      break;
    }
    // Path Effects
    case NodeType.SumPathEffect: {
      processChildren();
      declareSumPathEffect(ctx);
      break;
    }
    case NodeType.CornerPathEffect: {
      const pf = makeCornerPathEffect(ctx, props);
      composePathEffects(ctx, pf, processChildren);
      break;
    }
    case NodeType.Path1DPathEffect: {
      const pf = makePath1DPathEffect(ctx, props);
      composePathEffects(ctx, pf, processChildren);
      break;
    }
    case NodeType.Path2DPathEffect: {
      const pf = makePath2DPathEffect(ctx, props);
      composePathEffects(ctx, pf, processChildren);
      break;
    }
    case NodeType.Line2DPathEffect: {
      const pf = makeLine2DPathEffect(ctx, props);
      composePathEffects(ctx, pf, processChildren);
      break;
    }
    case NodeType.DashPathEffect: {
      const pf = makeDashPathEffect(ctx, props);
      composePathEffects(ctx, pf, processChildren);
      break;
    }
    case NodeType.DiscretePathEffect: {
      const pf = makeDiscretePathEffect(ctx, props);
      composePathEffects(ctx, pf, processChildren);
      break;
    }
    // Paint
    case NodeType.Paint:
      processChildren();
      declarePaint(ctx, props);
      break;
    default:
      console.log("Unknown declaration node: ", type);
  }
}

const preProcessContext = (
  ctx: DrawingContext,
  props: DrawingNodeProps,
  node: Node<any>
) => {
  "worklet";
  const shouldRestoreMatrix = ctx.processMatrixAndClipping(props, props.layer);
  const declCtx = createDeclarationContext(ctx.Skia);
  node.children.forEach((child) => {
    if (child.isDeclaration) {
      processDeclarations(declCtx, child);
    }
  });
  const shouldRestorePaint = ctx.processPaint(props, declCtx);
  return {
    shouldRestoreMatrix,
    shouldRestorePaint,
    extraPaints: declCtx.paints.popAll(),
  };
};

const drawBackdropFilter = (ctx: DrawingContext, node: Node) => {
  "worklet";
  const { canvas, Skia } = ctx;
  const child = node.children[0];
  let imageFilter: SkImageFilter | null = null;
  if (child.isDeclaration) {
    const declCtx = createDeclarationContext(ctx.Skia);
    processDeclarations(declCtx, child);
    const imgf = declCtx.imageFilters.pop();
    if (imgf) {
      imageFilter = imgf;
    } else {
      const cf = declCtx.colorFilters.pop();
      if (cf) {
        imageFilter = Skia.ImageFilter.MakeColorFilter(cf, null);
      }
    }
  }
  canvas.saveLayer(undefined, null, imageFilter);
  canvas.restore();
};

export function draw(ctx: DrawingContext, node: Node<any>) {
  "worklet";
  // Special mixed nodes
  if (node.type === NodeType.BackdropFilter) {
    drawBackdropFilter(ctx, node);
    return;
  }
  if (node.type === NodeType.Layer) {
    let hasLayer = false;
    const [layer, ...children] = node.children;
    if (layer.isDeclaration) {
      const declCtx = createDeclarationContext(ctx.Skia);
      processDeclarations(declCtx, layer);
      const paint = declCtx.paints.pop();
      if (paint) {
        hasLayer = true;
        ctx.canvas.saveLayer(paint);
      }
    }
    children.map((child) => {
      if (!child.isDeclaration) {
        draw(ctx, child);
      }
    });
    if (hasLayer) {
      ctx.canvas.restore();
    }
    return;
  }
  // Regular nodes
  materialize(node);
  const { type, props, children } = node;
  const { shouldRestoreMatrix, shouldRestorePaint, extraPaints } =
    preProcessContext(ctx, props, node);
  const paints = [ctx.getPaint(), ...extraPaints];
  paints.forEach((paint) => {
    const lctx = { paint, Skia: ctx.Skia, canvas: ctx.canvas };
    switch (type) {
      case NodeType.Box:
        drawBox(lctx, props, node.children);
        break;
      case NodeType.Image:
        drawImage(lctx, props);
        break;
      case NodeType.Points:
        drawPoints(lctx, props);
        break;
      case NodeType.Path:
        drawPath(lctx, props);
        break;
      case NodeType.Rect:
        drawRect(lctx, props);
        break;
      case NodeType.RRect:
        drawRRect(lctx, props);
        break;
      case NodeType.Oval:
        drawOval(lctx, props);
        break;
      case NodeType.Line:
        drawLine(lctx, props);
        break;
      case NodeType.Patch:
        drawPatch(lctx, props);
        break;
      case NodeType.Vertices:
        drawVertices(lctx, props);
        break;
      case NodeType.DiffRect:
        drawDiffRect(lctx, props);
        break;
      case NodeType.Text:
        drawText(lctx, props);
        break;
      case NodeType.TextPath:
        drawTextPath(lctx, props);
        break;
      case NodeType.TextBlob:
        drawTextBlob(lctx, props);
        break;
      case NodeType.Glyphs:
        drawGlyphs(lctx, props);
        break;
      case NodeType.Picture:
        drawPicture(lctx, props);
        break;
      case NodeType.ImageSVG:
        drawImageSVG(lctx, props);
        break;
      case NodeType.Paragraph:
        drawParagraph(lctx, props);
        break;
      case NodeType.Atlas:
        drawAtlas(lctx, props);
        break;
      case NodeType.Circle:
        drawCircle(lctx, props);
        break;
      case NodeType.Fill:
        drawFill(lctx, props);
        break;
      case NodeType.Group:
        // TODO: do nothing
        break;
      default:
        if (!node.isDeclaration) {
          console.warn(`Unsupported node type: ${type}`);
        }
    }
  });
  children.forEach((child) => {
    if (!child.isDeclaration) {
      draw(ctx, child);
    }
  });
  if (shouldRestoreMatrix) {
    ctx.canvas.restore();
  }
  if (shouldRestorePaint) {
    ctx.restore();
  }
}
