/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CTMProps,
  DrawingNodeProps,
  BoxShadowProps,
} from "../../dom/types";
import { NodeType } from "../../dom/types";
import type { Node } from "../Node";
import { isImageFilter, isShader, sortNodeChildren } from "../Node";

import type { Recorder } from "./Recorder";

export const processPaint = ({
  opacity,
  color,
  strokeWidth,
  blendMode,
  style,
  strokeJoin,
  strokeCap,
  strokeMiter,
  antiAlias,
  dither,
  paint: paintRef,
}: DrawingNodeProps) => {
  const paint: DrawingNodeProps = {};
  if (opacity !== undefined) {
    paint.opacity = opacity;
  }
  if (color !== undefined) {
    paint.color = color;
  }
  if (strokeWidth !== undefined) {
    paint.strokeWidth = strokeWidth;
  }
  if (blendMode !== undefined) {
    paint.blendMode = blendMode;
  }
  if (style !== undefined) {
    paint.style = style;
  }
  if (strokeJoin !== undefined) {
    paint.strokeJoin = strokeJoin;
  }
  if (strokeCap !== undefined) {
    paint.strokeCap = strokeCap;
  }
  if (strokeMiter !== undefined) {
    paint.strokeMiter = strokeMiter;
  }
  if (antiAlias !== undefined) {
    paint.antiAlias = antiAlias;
  }
  if (dither !== undefined) {
    paint.dither = dither;
  }

  if (paintRef !== undefined) {
    paint.paint = paintRef;
  }

  if (
    opacity !== undefined ||
    color !== undefined ||
    strokeWidth !== undefined ||
    blendMode !== undefined ||
    style !== undefined ||
    strokeJoin !== undefined ||
    strokeCap !== undefined ||
    strokeMiter !== undefined ||
    antiAlias !== undefined ||
    dither !== undefined ||
    paintRef !== undefined
  ) {
    return paint;
  }
  return null;
};

const processCTM = ({
  clip,
  invertClip,
  transform,
  origin,
  matrix,
  layer,
}: CTMProps) => {
  const ctm: CTMProps = {};
  if (clip) {
    ctm.clip = clip;
  }
  if (invertClip) {
    ctm.invertClip = invertClip;
  }
  if (transform) {
    ctm.transform = transform;
  }
  if (origin) {
    ctm.origin = origin;
  }
  if (matrix) {
    ctm.matrix = matrix;
  }
  if (layer) {
    ctm.layer = layer;
  }
  if (
    clip !== undefined ||
    invertClip !== undefined ||
    transform !== undefined ||
    origin !== undefined ||
    matrix !== undefined ||
    layer !== undefined
  ) {
    return ctm;
  }
  return null;
};

const pushColorFilters = (recorder: Recorder, colorFilters: Node<any>[]) => {
  colorFilters.forEach((colorFilter) => {
    if (colorFilter.children.length > 0) {
      pushColorFilters(recorder, colorFilter.children);
    }
    recorder.pushColorFilter(colorFilter.type, colorFilter.props);
    const needsComposition =
      colorFilter.type !== NodeType.LerpColorFilter &&
      colorFilter.children.length > 0;
    if (needsComposition) {
      recorder.composeColorFilter();
    }
  });
};

const pushPathEffects = (recorder: Recorder, pathEffects: Node<any>[]) => {
  pathEffects.forEach((pathEffect) => {
    if (pathEffect.children.length > 0) {
      pushPathEffects(recorder, pathEffect.children);
    }
    recorder.pushPathEffect(pathEffect.type, pathEffect.props);
    const needsComposition =
      pathEffect.type !== NodeType.SumPathEffect &&
      pathEffect.children.length > 0;
    if (needsComposition) {
      recorder.composePathEffect();
    }
  });
};

const pushImageFilters = (recorder: Recorder, imageFilters: Node<any>[]) => {
  imageFilters.forEach((imageFilter) => {
    if (imageFilter.children.length > 0) {
      pushImageFilters(recorder, imageFilter.children);
    }
    if (isImageFilter(imageFilter.type)) {
      recorder.pushImageFilter(imageFilter.type, imageFilter.props);
    } else if (isShader(imageFilter.type)) {
      recorder.pushShader(imageFilter.type, imageFilter.props);
    }
    const needsComposition =
      imageFilter.type !== NodeType.BlendImageFilter &&
      imageFilter.children.length > 0;
    if (needsComposition) {
      recorder.composeImageFilter();
    }
  });
};

const pushShaders = (recorder: Recorder, shaders: Node<any>[]) => {
  shaders.forEach((shader) => {
    if (shader.children.length > 0) {
      pushShaders(recorder, shader.children);
    }
    recorder.pushShader(shader.type, shader.props);
  });
};

const pushMaskFilters = (recorder: Recorder, maskFilters: Node<any>[]) => {
  if (maskFilters.length > 0) {
    recorder.pushBlurMaskFilter(maskFilters[maskFilters.length - 1].props);
  }
};

const pushPaints = (recorder: Recorder, paints: Node<any>[]) => {
  paints.forEach((paint) => {
    recorder.savePaint(paint.props);
    const { colorFilters, maskFilters, shaders, imageFilters, pathEffects } =
      sortNodeChildren(paint);
    pushColorFilters(recorder, colorFilters);
    pushImageFilters(recorder, imageFilters);
    pushMaskFilters(recorder, maskFilters);
    pushShaders(recorder, shaders);
    pushPathEffects(recorder, pathEffects);
    recorder.restorePaintDeclaration();
  });
};

const visitNode = (recorder: Recorder, node: Node<any>) => {
  if (node.type === NodeType.Group) {
    recorder.saveGroup();
  }
  const { props } = node;
  const {
    colorFilters,
    maskFilters,
    drawings,
    shaders,
    imageFilters,
    pathEffects,
    paints,
  } = sortNodeChildren(node);
  const paint = processPaint(props);
  const shouldPushPaint =
    paint ||
    colorFilters.length > 0 ||
    maskFilters.length > 0 ||
    imageFilters.length > 0 ||
    pathEffects.length > 0 ||
    shaders.length > 0;
  if (shouldPushPaint) {
    recorder.savePaint(paint ?? {});
    pushColorFilters(recorder, colorFilters);
    pushImageFilters(recorder, imageFilters);
    pushMaskFilters(recorder, maskFilters);
    pushShaders(recorder, shaders);
    pushPathEffects(recorder, pathEffects);
    // For mixed nodes like BackdropFilters we don't materialize the paint
    if (node.type === NodeType.BackdropFilter) {
      recorder.saveBackdropFilter();
    } else {
      recorder.materializePaint();
    }
  }
  pushPaints(recorder, paints);
  if (node.type === NodeType.Layer) {
    recorder.saveLayer();
  }
  const ctm = processCTM(props);
  const shouldRestore = !!ctm || node.type === NodeType.Layer;
  if (ctm) {
    recorder.saveCTM(ctm);
  }
  switch (node.type) {
    case NodeType.Box:
      const shadows = node.children
        .filter((n) => n.type === NodeType.BoxShadow)
        // eslint-disable-next-line @typescript-eslint/no-shadow
        .map(({ props }) => ({ props } as { props: BoxShadowProps }));
      recorder.drawBox(props, shadows);
      break;
    case NodeType.Fill:
      recorder.drawPaint();
      break;
    case NodeType.Image:
      recorder.drawImage(node.props);
      break;
    case NodeType.Circle:
      recorder.drawCircle(node.props);
      break;
    case NodeType.Points:
      recorder.drawPoints(props);
      break;
    case NodeType.Path:
      recorder.drawPath(props);
      break;
    case NodeType.Rect:
      recorder.drawRect(props);
      break;
    case NodeType.RRect:
      recorder.drawRRect(props);
      break;
    case NodeType.Oval:
      recorder.drawOval(props);
      break;
    case NodeType.Line:
      recorder.drawLine(props);
      break;
    case NodeType.Patch:
      recorder.drawPatch(props);
      break;
    case NodeType.Vertices:
      recorder.drawVertices(props);
      break;
    case NodeType.DiffRect:
      recorder.drawDiffRect(props);
      break;
    case NodeType.Text:
      recorder.drawText(props);
      break;
    case NodeType.TextPath:
      recorder.drawTextPath(props);
      break;
    case NodeType.TextBlob:
      recorder.drawTextBlob(props);
      break;
    case NodeType.Glyphs:
      recorder.drawGlyphs(props);
      break;
    case NodeType.Picture:
      recorder.drawPicture(props);
      break;
    case NodeType.ImageSVG:
      recorder.drawImageSVG(props);
      break;
    case NodeType.Paragraph:
      recorder.drawParagraph(props);
      break;
    case NodeType.Atlas:
      recorder.drawAtlas(props);
      break;
  }
  drawings.forEach((drawing) => {
    visitNode(recorder, drawing);
  });
  if (shouldPushPaint) {
    recorder.restorePaint();
  }
  if (shouldRestore) {
    recorder.restoreCTM();
  }
  if (node.type === NodeType.Group) {
    recorder.restoreGroup();
  }
};

export const visit = (recorder: Recorder, root: Node[]) => {
  root.forEach((node) => {
    visitNode(recorder, node);
  });
};
