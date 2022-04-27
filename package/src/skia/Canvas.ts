import type { SkPaint } from "./Paint";
import type { SkRect } from "./Rect";
import type { SkFont } from "./Font";
import type { SkPath } from "./Path";
import type { SkImage, MipmapMode, FilterMode } from "./Image";
import type { SkSVG } from "./SVG";
import type { SkColor } from "./Color";
import type { SkRRect } from "./RRect";
import type { BlendMode } from "./Paint/BlendMode";
import type { SkPoint, PointMode } from "./Point";
import type { SkMatrix } from "./Matrix";
import type { SkImageFilter } from "./ImageFilter";
import type { SkVertices } from "./Vertices";
import type { SkTextBlob } from "./TextBlob";
import type { SkPicture } from "./Picture";

export enum ClipOp {
  Difference,
  Intersect,
}

export enum SaveLayerFlag {
  SaveLayerInitWithPrevious = 1 << 2,
  SaveLayerF16ColorType = 1 << 4,
}

export interface SkCanvas {
  /**
   * Draws the given image with its top-left corner at (left, top) using the current clip,
   * the current matrix, and optionally-provided paint.
   * @param img
   * @param left
   * @param top
   * @param paint
   */
  drawImage: (image: SkImage, x: number, y: number, paint?: SkPaint) => void;

  /**
   * Draws sub-rectangle src from provided image, scaled and translated to fill dst rectangle.
   * @param img
   * @param src
   * @param dest
   * @param paint
   * @param fastSample - if false, will filter strictly within src.
   */
  drawImageRect(
    img: SkImage,
    src: SkRect,
    dest: SkRect,
    paint: SkPaint,
    fastSample?: boolean
  ): void;

  /**
   * Draws the given image with its top-left corner at (left, top) using the current clip,
   * the current matrix. It will use the cubic sampling options B and C if necessary.
   * @param img
   * @param left
   * @param top
   * @param B - See CubicResampler in SkSamplingOptions.h for more information
   * @param C - See CubicResampler in SkSamplingOptions.h for more information
   * @param paint
   */
  drawImageCubic(
    img: SkImage,
    left: number,
    top: number,
    B: number,
    C: number,
    paint?: SkPaint | null
  ): void;

  /**
   * Draws the given image with its top-left corner at (left, top) using the current clip,
   * the current matrix. It will use the provided sampling options if necessary.
   * @param img
   * @param left
   * @param top
   * @param fm - The filter mode.
   * @param mm - The mipmap mode. Note: for settings other than None, the image must have mipmaps
   *             calculated with makeCopyWithDefaultMipmaps;
   * @param paint
   */
  drawImageOptions(
    img: SkImage,
    left: number,
    top: number,
    fm: FilterMode,
    mm: MipmapMode,
    paint?: SkPaint | null
  ): void;

  /**
   *  Draws the provided image stretched proportionally to fit into dst rectangle.
   *  The center rectangle divides the image into nine sections: four sides, four corners, and
   *  the center.
   * @param img
   * @param center
   * @param dest
   * @param filter - what technique to use when sampling the image
   * @param paint
   */
  drawImageNine(
    img: SkImage,
    center: SkRect,
    dest: SkRect,
    filter: FilterMode,
    paint?: SkPaint | null
  ): void;

  /**
   * Draws sub-rectangle src from provided image, scaled and translated to fill dst rectangle.
   * It will use the cubic sampling options B and C if necessary.
   * @param img
   * @param src
   * @param dest
   * @param B - See CubicResampler in SkSamplingOptions.h for more information
   * @param C - See CubicResampler in SkSamplingOptions.h for more information
   * @param paint
   */
  drawImageRectCubic(
    img: SkImage,
    src: SkRect,
    dest: SkRect,
    B: number,
    C: number,
    paint?: SkPaint | null
  ): void;

  /**
   * Draws sub-rectangle src from provided image, scaled and translated to fill dst rectangle.
   * It will use the provided sampling options if necessary.
   * @param img
   * @param src
   * @param dest
   * @param fm - The filter mode.
   * @param mm - The mipmap mode. Note: for settings other than None, the image must have mipmaps
   *             calculated with makeCopyWithDefaultMipmaps;
   * @param paint
   */
  drawImageRectOptions(
    img: SkImage,
    src: SkRect,
    dest: SkRect,
    fm: FilterMode,
    mm: MipmapMode,
    paint?: SkPaint | null
  ): void;

  /** Fills clip with SkPaint paint. SkPaint components, SkShader,
        SkColorFilter, SkImageFilter, and SkBlendMode affect drawing;
        SkMaskFilter and SkPathEffect in paint are ignored.

        @param paint  graphics state used to fill SkCanvas

        example: https://fiddle.skia.org/c/@Canvas_drawPaint
    */
  drawPaint: (paint: SkPaint) => void;

  /** Draws line segment from (x0, y0) to (x1, y1) using clip, SkMatrix, and SkPaint paint.
        In paint: SkPaint stroke width describes the line thickness;
        SkPaint::Cap draws the end rounded or square;
        SkPaint::Style is ignored, as if were set to SkPaint::kStroke_Style.

        @param x0     start of line segment on x-axis
        @param y0     start of line segment on y-axis
        @param x1     end of line segment on x-axis
        @param y1     end of line segment on y-axis
        @param paint  stroke, blend, color, and so on, used to draw

        example: https://fiddle.skia.org/c/@Canvas_drawLine
    */
  drawLine: (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    paint: SkPaint
  ) => void;
  /** Draws SkRect rect using clip, SkMatrix, and SkPaint paint.
        In paint: SkPaint::Style determines if rectangle is stroked or filled;
        if stroked, SkPaint stroke width describes the line thickness, and
        SkPaint::Join draws the corners rounded or square.

        @param rect   rectangle to draw
        @param paint  stroke or fill, blend, color, and so on, used to draw

        example: https://fiddle.skia.org/c/@Canvas_drawRect
    */
  drawRect: (rect: SkRect, paint: SkPaint) => void;

  /**
   * Draws a circle at (cx, cy) with the given radius.
   * @param cx
   * @param cy
   * @param radius
   * @param paint
   */
  drawCircle(cx: number, cy: number, radius: number, paint: SkPaint): void;

  /**
   * Draws the given vertices (a triangle mesh) using the current clip, current matrix, and the
   * provided paint.
   *  If paint contains an Shader and vertices does not contain texCoords, the shader
   *  is mapped using the vertices' positions.
   *  If vertices colors are defined in vertices, and Paint paint contains Shader,
   *  BlendMode mode combines vertices colors with Shader.
   * @param verts
   * @param mode
   * @param paint
   */
  drawVertices(verts: SkVertices, mode: BlendMode, paint: SkPaint): void;

  /**
   * Draws a cubic patch defined by 12 control points [top, right, bottom, left] with optional
   * colors and shader-coordinates [4] specifed for each corner [top-left, top-right, bottom-right, bottom-left]
   * @param cubics 12 points : 4 connected cubics specifying the boundary of the patch
   * @param colors optional colors interpolated across the patch
   * @param texs optional shader coordinates interpolated across the patch
   * @param mode Specifies how shader and colors blend (if both are specified)
   * @param paint
   */
  drawPatch(
    cubics: readonly SkPoint[],
    colors?: readonly SkColor[] | null,
    texs?: readonly SkPoint[] | null,
    mode?: BlendMode | null,
    paint?: SkPaint
  ): void;

  /**
   * Restores state to a previous stack value.
   * @param saveCount
   */
  restoreToCount(saveCount: number): void;

  /**
   * Draws the given points using the current clip, current matrix, and the provided paint.
   *
   * See Canvas.h for more on the mode and its interaction with paint.
   * @param mode
   * @param points
   * @param paint
   */
  drawPoints(mode: PointMode, points: SkPoint[], paint: SkPaint): void;

  /** Draws arc using clip, SkMatrix, and SkPaint paint.

        Arc is part of oval bounded by oval, sweeping from startAngle to startAngle plus
        sweepAngle. startAngle and sweepAngle are in degrees.

        startAngle of zero places start point at the right middle edge of oval.
        A positive sweepAngle places arc end point clockwise from start point;
        a negative sweepAngle places arc end point counterclockwise from start point.
        sweepAngle may exceed 360 degrees, a full circle.
        If useCenter is true, draw a wedge that includes lines from oval
        center to arc end points. If useCenter is false, draw arc between end points.

        If SkRect oval is empty or sweepAngle is zero, nothing is drawn.

        @param oval        SkRect bounds of oval containing arc to draw
        @param startAngle  angle in degrees where arc begins
        @param sweepAngle  sweep angle in degrees; positive is clockwise
        @param useCenter   if true, include the center of the oval
        @param paint       SkPaint stroke or fill, blend, color, and so on, used to draw
    */
  drawArc: (
    oval: SkRect,
    startAngle: number,
    sweepAngle: number,
    useCenter: boolean,
    paint: SkPaint
  ) => void;

  /**
   * Draws the given rectangle with rounded corners using the current clip, current matrix,
   * and the provided paint.
   * @param rrect
   * @param paint
   */
  drawRRect(rrect: SkRRect, paint: SkPaint): void;

  /**
   * Draws RRect outer and inner using clip, Matrix, and Paint paint.
   * outer must contain inner or the drawing is undefined.
   * @param outer
   * @param inner
   * @param paint
   */
  drawDRRect(outer: SkRRect, inner: SkRRect, paint: SkPaint): void;

  /**
   * Draws an oval bounded by the given rectangle using the current clip, current matrix,
   * and the provided paint.
   * @param oval
   * @param paint
   */
  drawOval(oval: SkRect, paint: SkPaint): void;

  /** Draws SkPath path using clip, SkMatrix, and SkPaint paint.
        SkPath contains an array of path contour, each of which may be open or closed.

        In paint: SkPaint::Style determines if SkRRect is stroked or filled:
        if filled, SkPath::FillType determines whether path contour describes inside or
        outside of fill; if stroked, SkPaint stroke width describes the line thickness,
        SkPaint::Cap describes line ends, and SkPaint::Join describes how
        corners are drawn.

        @param path   SkPath to draw
        @param paint  stroke, blend, color, and so on, used to draw

        example: https://fiddle.skia.org/c/@Canvas_drawPath
    */
  drawPath: (path: SkPath, paint: SkPaint) => void;

  /**
   * Draw the given text at the location (x, y) using the provided paint and font. The text will
   * be drawn as is; no shaping, left-to-right, etc.
   * @param str
   * @param x
   * @param y
   * @param paint
   * @param font
   */
  drawText(
    str: string,
    x: number,
    y: number,
    paint: SkPaint,
    font: SkFont
  ): void;

  /**
   * Draws the given TextBlob at (x, y) using the current clip, current matrix, and the
   * provided paint. Reminder that the fonts used to draw TextBlob are part of the blob.
   * @param blob
   * @param x
   * @param y
   * @param paint
   */
  drawTextBlob(blob: SkTextBlob, x: number, y: number, paint: SkPaint): void;

  /**
   * Draws a run of glyphs, at corresponding positions, in a given font.
   * @param glyphs the array of glyph IDs (Uint16TypedArray)
   * @param positions the array of x,y floats to position each glyph
   * @param x x-coordinate of the origin of the entire run
   * @param y y-coordinate of the origin of the entire run
   * @param font the font that contains the glyphs
   * @param paint
   */
  drawGlyphs(
    glyphs: number[],
    positions: SkPoint[],
    x: number,
    y: number,
    font: SkFont,
    paint: SkPaint
  ): void;

  /**
   * Renders the SVG Dom object to the canvas. If width/height are omitted,
   * the SVG will be rendered to fit the canvas.
   */
  drawSvg: (svgDom: SkSVG, width?: number, height?: number) => void;
  /** Saves SkMatrix and clip.
        Calling restore() discards changes to SkMatrix and clip,
        restoring the SkMatrix and clip to their state when save() was called.

        SkMatrix may be changed by translate(), scale(), rotate(), skew(), concat(), setMatrix(),
        and resetMatrix(). Clip may be changed by clipRect(), clipRRect(), clipPath(), clipRegion().

        Saved SkCanvas state is put on a stack; multiple calls to save() should be balance
        by an equal number of calls to restore().

        Call restoreToCount() with result to restore this and subsequent saves.

        @return  depth of saved stack

        example: https://fiddle.skia.org/c/@Canvas_save
    */
  save: () => number;

  /**
   * Saves Matrix and clip, and allocates a SkBitmap for subsequent drawing.
   * Calling restore() discards changes to Matrix and clip, and draws the SkBitmap.
   * It returns the height of the stack.
   * See Canvas.h for more.
   * @param paint
   * @param bounds
   * @param backdrop
   * @param flags
   */
  saveLayer(
    paint?: SkPaint,
    bounds?: SkRect | null,
    backdrop?: SkImageFilter | null,
    flags?: SaveLayerFlag
  ): number;

  /** Removes changes to SkMatrix and clip since SkCanvas state was
        last saved. The state is removed from the stack.

        Does nothing if the stack is empty.

        example: https://fiddle.skia.org/c/@AutoCanvasRestore_restore

        example: https://fiddle.skia.org/c/@Canvas_restore
    */
  restore: () => void;

  /**
   * Rotates the current matrix by the number of degrees.
   * @param rot - angle of rotation in degrees.
   * @param rx
   * @param ry
   */
  rotate(rotationInDegrees: number, rx: number, ry: number): void;

  /**
   * Scales the current matrix by sx on the x-axis and sy on the y-axis.
   * @param sx
   * @param sy
   */
  scale(sx: number, sy: number): void;

  /**
   *  Skews Matrix by sx on the x-axis and sy on the y-axis. A positive value of sx
   *  skews the drawing right as y-axis values increase; a positive value of sy skews
   *  the drawing down as x-axis values increase.
   * @param sx
   * @param sy
   */
  skew(sx: number, sy: number): void;

  /**
   * Translates Matrix by dx along the x-axis and dy along the y-axis.
   * @param dx
   * @param dy
   */
  translate(dx: number, dy: number): void;

  /**
   * Fills clip with the given color.
   * @param color
   * @param blendMode - defaults to SrcOver.
   */
  drawColor(color: SkColor, blendMode?: BlendMode): void;

  /**
   * Fills the current clip with the given color using Src BlendMode.
   * This has the effect of replacing all pixels contained by clip with color.
   * @param color
   */
  clear(color: SkColor): void;

  /**
   * Replaces clip with the intersection or difference of the current clip and path,
   * with an aliased or anti-aliased clip edge.
   * @param path
   * @param op
   * @param doAntiAlias
   */
  clipPath(path: SkPath, op: ClipOp, doAntiAlias: boolean): void;

  /**
   * Replaces clip with the intersection or difference of the current clip and rect,
   * with an aliased or anti-aliased clip edge.
   * @param rect
   * @param op
   * @param doAntiAlias
   */
  clipRect(rect: SkRect, op: ClipOp, doAntiAlias: boolean): void;

  /**
   * Replaces clip with the intersection or difference of the current clip and rrect,
   * with an aliased or anti-aliased clip edge.
   * @param rrect
   * @param op
   * @param doAntiAlias
   */
  clipRRect(rrect: SkRRect, op: ClipOp, doAntiAlias: boolean): void;

  /**
   * Replaces current matrix with m premultiplied with the existing matrix.
   * @param m
   */
  concat(m: SkMatrix): void;

  /**
   * Draws the given picture using the current clip, current matrix, and the provided paint.
   * @param skp
   */
  drawPicture(skp: SkPicture): void;
  drawScene(): void;
}
