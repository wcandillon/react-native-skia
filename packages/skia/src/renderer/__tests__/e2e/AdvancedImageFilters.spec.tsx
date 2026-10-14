import { docPath, checkImage, itRunsE2eOnly } from "../../../__tests__/setup";
import {
  BlendMode,
  FilterMode,
  MipmapMode,
  PaintStyle,
  TileMode,
} from "../../../skia/types";
import { surface, importSkia, images } from "../setup";

const checkResult = (base64: string, path: string) => {
  const { Skia } = importSkia();
  const rData = Skia.Data.fromBase64(base64);
  const image = Skia.Image.MakeImageFromEncoded(rData)!;
  expect(rData).toBeDefined();
  checkImage(image, docPath(path));
};

describe("Advanced Image Filters", () => {
  itRunsE2eOnly("Arithmetic - Neon Glow", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeRaster(768, 768)!;
        const canvas = sur.getCanvas();
        const paint = Skia.Paint();
        // Create a blurred version of the image for the glow effect
        const CLAMP = 0;
        const blurFilter = Skia.ImageFilter.MakeBlur(5.0, 5.0, CLAMP);

        // Original image
        const originalImage = null; // This uses the source bitmap

        // Neon Glow effect
        const neonGlowFilter = Skia.ImageFilter.MakeArithmetic(
          0.0, // k1: No multiplication between foreground and background
          1.5, // k2: Amplify the blurred foreground (the glow)
          1.0, // k3: Keep the original background fully
          0.0, // k4: No constant addition
          true, // enforcePMColor: Clamp RGB channels to alpha
          originalImage, // background: Original sharp image
          blurFilter, // foreground: Blurred version creates the glow
          null // cropRect: No cropping
        );
        paint.setImageFilter(neonGlowFilter);
        canvas.drawImage(ctx.skiaLogoPng, 0, 0, paint);
        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng }
    );
    checkResult(base64, "advanced-image-filters/arithmetic-neon-glow.png");
  });

  itRunsE2eOnly("Crop - Viewport Portal", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeRaster(768, 768)!;
        const canvas = sur.getCanvas();

        // Draw background image first
        canvas.drawImage(ctx.skiaLogoPng, 0, 0);

        // Create a paint for our portal effect
        const paint = Skia.Paint();

        // Create an input filter that applies a colorization and rotation to the secondary image
        const colorMatrix = [
          0.8,
          0.2,
          0,
          0,
          0, // Add some red tint
          0.2,
          0.8,
          0,
          0,
          0, // Add some green tint
          0,
          0.2,
          1.0,
          0,
          0, // Add some blue boost
          0,
          0,
          0,
          1,
          0, // Alpha unchanged
        ];

        // Create color matrix filter
        const colorFilter = Skia.ColorFilter.MakeMatrix(colorMatrix);

        // Create the image filter from the secondary image
        const secondaryImageFilter = Skia.ImageFilter.MakeColorFilter(
          colorFilter,
          Skia.ImageFilter.MakeImage(ctx.skiaLogoPng)
        );

        // Define a circular viewport in the center
        const centerX = 384;
        const centerY = 384;
        const radius = 150;

        // Create a circular crop rect (positioned to center of canvas)
        const cropRect = Skia.XYWHRect(
          centerX - radius,
          centerY - radius,
          radius * 2,
          radius * 2
        );

        // Use MIRROR tiling mode for an interesting effect at the edges
        const MIRROR = ctx.TileMode.Mirror;

        // Create the crop filter with mirror tiling
        const portalFilter = Skia.ImageFilter.MakeCrop(
          cropRect,
          MIRROR,
          secondaryImageFilter
        );

        // Set the filter to our paint
        paint.setImageFilter(portalFilter);

        // Draw a circle that will contain our portal effect
        canvas.drawCircle(centerX, centerY, radius, paint);

        // Optional: Add a stroke around the portal for definition
        const strokePaint = Skia.Paint();
        strokePaint.setStyle(ctx.PaintStyle.Stroke);
        strokePaint.setStrokeWidth(8);
        strokePaint.setColor(Skia.Color("white"));
        canvas.drawCircle(centerX, centerY, radius, strokePaint);

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, PaintStyle, TileMode }
    );
    checkResult(base64, "advanced-image-filters/crop-viewport-portal.png");
  });

  itRunsE2eOnly("Empty - Silhouette Effect", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeRaster(768, 768)!;
        const canvas = sur.getCanvas();

        // Fill background with a gradient
        const bgPaint = Skia.Paint();
        const shader = Skia.Shader.MakeLinearGradient(
          { x: 0, y: 0 },
          { x: 768, y: 768 },
          [
            Skia.Color("rgba(20, 20, 100, 1)"),
            Skia.Color("rgba(100, 40, 150, 1)"),
          ],
          null,
          ctx.TileMode.Clamp
        );
        bgPaint.setShader(shader);
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Create our silhouette effect
        const paint = Skia.Paint();

        // First, we'll create a mask using the original image and a blur
        const imageMask = Skia.ImageFilter.MakeImage(ctx.skiaLogoPng);
        const blurredMask = Skia.ImageFilter.MakeBlur(
          3,
          3,
          ctx.TileMode.Decal,
          imageMask
        );

        // Create an empty filter (transparent black)
        const emptyFilter = Skia.ImageFilter.MakeEmpty();

        // Combine the mask with empty filter using MakeBlend
        // This creates a silhouette where the image is
        const BLEND_MODE = ctx.BlendMode.Src;
        const silhouetteFilter = Skia.ImageFilter.MakeBlend(
          BLEND_MODE,
          emptyFilter, // Using the empty filter for the black silhouette
          blurredMask // Using the blurred image as the mask
        );

        // Set our filter to the paint
        paint.setImageFilter(silhouetteFilter);
        paint.setColor(Skia.Color("rgba(0,0,0,0.8)")); // Semi-transparent black

        // Draw a rectangle covering the entire canvas with our filter
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), paint);

        // Add some decorative highlights at the edges
        const highlightPaint = Skia.Paint();
        highlightPaint.setColor(Skia.Color("rgba(255, 255, 255, 0.4)"));
        highlightPaint.setImageFilter(blurredMask);
        canvas.drawRect(Skia.XYWHRect(5, 5, 758, 758), highlightPaint);

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, BlendMode, TileMode }
    );
    checkResult(base64, "advanced-image-filters/empty-silhouette.png");
  });

  itRunsE2eOnly("MakeImage - Dynamic Mosaic", async () => {
    const { skiaLogoPng, mask } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeRaster(768, 768)!;
        const canvas = sur.getCanvas();

        // Draw a background
        const bgPaint = Skia.Paint();
        bgPaint.setColor(Skia.Color("gray"));
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Create a mosaic effect using MakeImage filter
        const mosaicPaint = Skia.Paint();

        // We'll create a 4x4 grid of tiles
        const numTiles = 4;
        const tileSize = 768 / numTiles;

        // We'll alternate between the two images
        const allImages = [ctx.skiaLogoPng, ctx.mask];

        // Draw each tile with a different srcRect using MakeImage
        for (let y = 0; y < numTiles; y++) {
          for (let x = 0; x < numTiles; x++) {
            // Alternate images based on checkerboard pattern
            const imageIndex = (x + y) % 2;
            const currentImage = allImages[imageIndex];

            // Calculate source rectangle (use different areas of the source image)
            // We'll create a dynamic effect by using different parts of the image
            const srcX = (x * currentImage.width()) / numTiles;
            const srcY = (y * currentImage.height()) / numTiles;
            const srcWidth = currentImage.width() / numTiles;
            const srcHeight = currentImage.height() / numTiles;

            const srcRect = Skia.XYWHRect(srcX, srcY, srcWidth, srcHeight);

            // Calculate destination rectangle with some margin for visual separation
            const margin = 8;
            const dstX = x * tileSize + margin / 2;
            const dstY = y * tileSize + margin / 2;
            const dstWidth = tileSize - margin;
            const dstHeight = tileSize - margin;

            const dstRect = Skia.XYWHRect(dstX, dstY, dstWidth, dstHeight);

            // Create the image filter with Linear filtering for smoother scaling
            const imageFilter = Skia.ImageFilter.MakeImage(
              currentImage,
              srcRect,
              dstRect,
              ctx.FilterMode.Linear,
              ctx.MipmapMode.Linear
            );

            // Set the filter and draw the tile
            mosaicPaint.setImageFilter(imageFilter);
            canvas.drawRect(dstRect, mosaicPaint);

            // Add a subtle border around each tile
            const borderPaint = Skia.Paint();
            borderPaint.setStyle(ctx.PaintStyle.Stroke);
            borderPaint.setStrokeWidth(2);
            borderPaint.setColor(Skia.Color("gray"));
            canvas.drawRect(dstRect, borderPaint);
          }
        }

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, FilterMode, MipmapMode, PaintStyle, TileMode, mask }
    );
    checkResult(base64, "advanced-image-filters/makeimage-mosaic.png");
  });
  itRunsE2eOnly("MatrixConvolution - Embossed Metallic Effect", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeRaster(768, 768)!;
        const canvas = sur.getCanvas();

        // First, let's create a metallic gradient background
        const bgPaint = Skia.Paint();
        const shader = Skia.Shader.MakeLinearGradient(
          { x: 0, y: 0 },
          { x: 768, y: 768 },
          [
            Skia.Color("rgb(180, 180, 190)"), // Light silver
            Skia.Color("rgb(100, 100, 110)"), // Medium gray
            Skia.Color("rgb(140, 140, 160)"), // Silver again
            Skia.Color("rgb(70, 70, 90)"), // Dark silver
          ],
          [0.0, 0.3, 0.7, 1.0],
          ctx.TileMode.Clamp
        );
        bgPaint.setShader(shader);
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Create our emboss effect paint
        const embossPaint = Skia.Paint();

        // For an emboss effect, we use a 3x3 kernel that highlights
        // edges in a directional way (typically top-left to bottom-right)
        // This creates the illusion of depth
        const kernelSizeX = 3;
        const kernelSizeY = 3;

        // Emboss kernel - this will create a 3D effect with light coming from top-left
        const kernel = [
          -2,
          -1,
          0, // Top row
          -1,
          1,
          1, // Middle row
          0,
          1,
          2, // Bottom row
        ];

        // Set kernel parameters
        const gain = 1.0; // Standard scaling
        const bias = 128.0; // Add a mid-gray to make the effect visible

        // Center the kernel over each pixel
        const kernelOffsetX = 1;
        const kernelOffsetY = 1;

        // Create the matrix convolution filter
        const embossFilter = Skia.ImageFilter.MakeMatrixConvolution(
          kernelSizeX,
          kernelSizeY,
          kernel,
          gain,
          bias,
          kernelOffsetX,
          kernelOffsetY,
          ctx.TileMode.Clamp, // Use clamp for edge pixels
          false, // Don't convolve alpha to maintain shape
          null, // Use source bitmap as input
          null // No crop rect
        );

        // Set the filter to our paint
        embossPaint.setImageFilter(embossFilter);

        // To enhance the metallic look, let's add some color desaturation
        // Grayscale color matrix with a slight blue-silver tint
        const colorMatrix = [
          0.33,
          0.33,
          0.33,
          0,
          0, // Red channel
          0.33,
          0.33,
          0.33,
          0,
          0, // Green channel
          0.34,
          0.34,
          0.34,
          0,
          10, // Blue channel (slightly boosted)
          0,
          0,
          0,
          1,
          0, // Alpha channel unchanged
        ];

        const colorFilter = Skia.ColorFilter.MakeMatrix(colorMatrix);
        embossPaint.setColorFilter(colorFilter);

        // Now let's draw our image with the emboss effect
        // Scale down slightly to leave a border
        const padding = 40;
        const imageRect = Skia.XYWHRect(
          padding,
          padding,
          768 - padding * 2,
          768 - padding * 2
        );

        canvas.drawImageRect(
          ctx.skiaLogoPng,
          Skia.XYWHRect(
            0,
            0,
            ctx.skiaLogoPng.width(),
            ctx.skiaLogoPng.height()
          ),
          imageRect,
          embossPaint
        );

        // Add a subtle bevel frame to enhance the metallic appearance
        const framePaint = Skia.Paint();

        // Outer edge - dark shadow
        framePaint.setStyle(ctx.PaintStyle.Stroke);
        framePaint.setStrokeWidth(8);
        framePaint.setColor(Skia.Color("rgba(60, 60, 70, 0.8)"));
        canvas.drawRect(
          Skia.XYWHRect(
            padding - 10,
            padding - 10,
            768 - padding * 2 + 20,
            768 - padding * 2 + 20
          ),
          framePaint
        );

        // Inner edge - highlight
        framePaint.setStrokeWidth(4);
        framePaint.setColor(Skia.Color("rgba(220, 220, 230, 0.8)"));
        canvas.drawRect(
          Skia.XYWHRect(
            padding - 4,
            padding - 4,
            768 - padding * 2 + 8,
            768 - padding * 2 + 8
          ),
          framePaint
        );

        // Add some decorative rivets on the corners to enhance metallic look
        const rivetPaint = Skia.Paint();
        rivetPaint.setColor(Skia.Color("rgb(160, 160, 180)"));

        // Draw rivets at the corners
        const rivetRadius = 12;
        const rivetOffset = 24;
        const rivetPositions = [
          { x: padding - rivetOffset, y: padding - rivetOffset },
          { x: 768 - padding + rivetOffset, y: padding - rivetOffset },
          { x: padding - rivetOffset, y: 768 - padding + rivetOffset },
          { x: 768 - padding + rivetOffset, y: 768 - padding + rivetOffset },
        ];

        // Draw each rivet with a metallic gradient
        rivetPositions.forEach((pos) => {
          // Rivet base
          rivetPaint.setShader(
            Skia.Shader.MakeRadialGradient(
              { x: pos.x, y: pos.y },
              rivetRadius,
              [
                Skia.Color("rgb(200, 200, 210)"),
                Skia.Color("rgb(130, 130, 140)"),
              ],
              [0.2, 1.0],
              ctx.TileMode.Clamp
            )
          );
          canvas.drawCircle(pos.x, pos.y, rivetRadius, rivetPaint);

          // Rivet highlight
          const highlightPaint = Skia.Paint();
          highlightPaint.setColor(Skia.Color("rgba(240, 240, 250, 0.8)"));
          canvas.drawCircle(
            pos.x - 3,
            pos.y - 3,
            rivetRadius / 3,
            highlightPaint
          );
        });

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, TileMode, PaintStyle }
    );
    checkResult(
      base64,
      "advanced-image-filters/matrix-convolution-embossed-metal.png"
    );
  });
});
