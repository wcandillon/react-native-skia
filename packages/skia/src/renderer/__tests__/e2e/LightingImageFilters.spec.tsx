import { importSkia, surface, images } from "../setup";
import type { SkColor } from "../../../skia/types";
import { BlendMode, ClipOp, PaintStyle, TileMode } from "../../../skia/types";
import { checkImage, docPath, itRunsE2eOnly } from "../../../__tests__/setup";

const checkResult = async (base64: string, path: string) => {
  const { Skia } = importSkia();
  const rData = Skia.Data.fromBase64(base64);
  const image = Skia.Image.MakeFromEncoded(rData)!;
  expect(rData).toBeDefined();
  await checkImage(image, docPath(path));
};

describe("Lighting Image Filters", () => {
  itRunsE2eOnly("DistantLitDiffuse - Dramatic Relief", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeOffscreen(768, 768)!;
        const canvas = sur.getCanvas();

        // Create a dark background to enhance contrast
        const bgPaint = Skia.Paint();
        bgPaint.setColor(Skia.Color("rgb(20, 20, 30)"));
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Create high-contrast emboss effect
        const paint = Skia.Paint();

        // Pre-process the image with a threshold filter to make shapes more defined
        // This will help the lighting effect appear more dramatic
        const inputFilter = Skia.ImageFilter.MakeColorFilter(
          Skia.ColorFilter.MakeMatrix([
            1.5,
            0,
            0,
            0,
            -20, // Increased contrast for red
            0,
            1.5,
            0,
            0,
            -20, // Increased contrast for green
            0,
            0,
            1.5,
            0,
            -20, // Increased contrast for blue
            0,
            0,
            0,
            1.2,
            0, // Slightly boosted alpha
          ]),
          null
        );

        // Direction vector for dramatic side lighting
        const direction = { x: -3, y: -0.5, z: 0.5 };

        // Light color (stark white for contrast)
        const lightColor = Skia.Color("rgb(255, 255, 255)");

        // Higher surface scale for more dramatic relief
        const surfaceScale = 4.0;
        const kd = 2.5; // Stronger diffuse coefficient

        // Create the distant light diffuse filter
        const distantLitFilter = Skia.ImageFilter.MakeDistantLitDiffuse(
          direction,
          lightColor,
          surfaceScale,
          kd,
          inputFilter, // Use high-contrast image as input
          null // No crop rect
        );

        // Set the filter to our paint
        paint.setImageFilter(distantLitFilter);

        // Add a subtle color tint
        paint.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            1.2,
            0,
            0,
            0,
            10, // Boosted red
            0,
            1.0,
            0,
            0,
            0, // Normal green
            0,
            0,
            0.8,
            0,
            0, // Reduced blue for warmer tone
            0,
            0,
            0,
            1,
            0, // Alpha unchanged
          ])
        );

        // Draw the image with the dramatic lighting
        const padding = 30;
        canvas.drawImageRect(
          ctx.skiaLogoPng,
          Skia.XYWHRect(
            0,
            0,
            ctx.skiaLogoPng.width(),
            ctx.skiaLogoPng.height()
          ),
          Skia.XYWHRect(padding, padding, 768 - padding * 2, 768 - padding * 2),
          paint
        );

        // Add a subtle vignette effect to enhance depth
        const vignetteRect = Skia.XYWHRect(-100, -100, 968, 968);
        const vignettePaint = Skia.Paint();
        const vignetteShader = Skia.Shader.MakeRadialGradient(
          { x: 384, y: 384 },
          500,
          [Skia.Color("rgba(0,0,0,0)"), Skia.Color("rgba(0,0,0,0.7)")],
          [0.5, 1.0],
          ctx.TileMode.Clamp
        );
        vignettePaint.setShader(vignetteShader);
        canvas.drawRect(vignetteRect, vignettePaint);

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, TileMode }
    );
    await checkResult(base64, "lighting-image-filters/distant-lit-diffuse.png");
  });

  itRunsE2eOnly("PointLitDiffuse - Glowing Core", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeOffscreen(768, 768)!;
        const canvas = sur.getCanvas();

        // Create a dark background (not completely black) for better visibility
        const bgPaint = Skia.Paint();
        bgPaint.setColor(Skia.Color("rgb(10, 10, 15)"));
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Create a glowing center effect
        const paint = Skia.Paint();

        // Position light inside the image for a glowing core effect
        // Moved light closer to surface (z is now positive)
        const location = { x: 384, y: 384, z: 200 };

        // Light color (intense orange-yellow for a fiery glow)
        const lightColor = Skia.Color("rgb(255, 200, 50)");

        // Parameters for the filter
        const surfaceScale = 2.0; // Height effect
        const kd = 1.5; // Diffuse reflection strength

        // Create the point light diffuse filter
        const pointLitFilter = Skia.ImageFilter.MakePointLitDiffuse(
          location,
          lightColor,
          surfaceScale,
          kd,
          null, // Use source bitmap as input
          null // No crop rect
        );

        // Set the filter to our paint
        paint.setImageFilter(pointLitFilter);

        // Add a color boost to make the effect more visible
        paint.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            1.2,
            0,
            0,
            0,
            20, // Boosted red
            0,
            1.1,
            0,
            0,
            10, // Boosted green
            0,
            0,
            1.0,
            0,
            0, // Blue unchanged
            0,
            0,
            0,
            1,
            0, // Alpha unchanged
          ])
        );

        // Draw the image with the glowing core effect
        canvas.drawImage(ctx.skiaLogoPng, 0, 0, paint);

        // Add a second layer of lighting for more intensity
        const accentPaint = Skia.Paint();
        const accentFilter = Skia.ImageFilter.MakePointLitDiffuse(
          { x: 384, y: 384, z: 50 }, // Closer light source
          Skia.Color("rgb(255, 255, 200)"), // Brighter light
          surfaceScale * 0.5,
          kd * 0.8,
          null,
          null
        );

        accentPaint.setImageFilter(accentFilter);
        accentPaint.setBlendMode(ctx.BlendMode.Plus); // Additive lighting

        // Draw second layer
        canvas.drawImage(ctx.skiaLogoPng, 0, 0, accentPaint);

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, BlendMode }
    );
    await checkResult(
      base64,
      `lighting-image-filters/point-lit-diffuse-${surface.OS}.png`
    );
  });

  itRunsE2eOnly("SpotLitDiffuse - Theatrical Spotlight", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeOffscreen(768, 768)!;
        const canvas = sur.getCanvas();

        // Fill background with deep black for theatrical effect
        const bgPaint = Skia.Paint();
        bgPaint.setColor(Skia.Color("rgb(0, 0, 0)"));
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Add a very subtle gradient stage background
        const stagePaint = Skia.Paint();
        const stageShader = Skia.Shader.MakeLinearGradient(
          { x: 0, y: 600 },
          { x: 0, y: 768 },
          [
            Skia.Color("rgba(20, 10, 30, 0)"),
            Skia.Color("rgba(40, 20, 60, 0.6)"),
          ],
          null,
          ctx.TileMode.Clamp
        );
        stagePaint.setShader(stageShader);
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), stagePaint);

        // Create multiple spotlight effects for dramatic theatre lighting
        const createSpotlight = (
          location: { x: number; y: number; z: number },
          target: { x: number; y: number; z: number },
          color: SkColor,
          intensity: number,
          angle: number
        ) => {
          const paint = Skia.Paint();

          // Spotlight parameters
          const falloffExponent = 2.5; // Sharp falloff
          const cutoffAngle = angle; // Narrow spotlight cone

          // Light color
          const lightColor = color;

          // Surface parameters
          const surfaceScale = 2.0;
          const kd = intensity; // Strong diffuse coefficient for dramatic effect

          // Create the spotlight diffuse filter
          const spotLitFilter = Skia.ImageFilter.MakeSpotLitDiffuse(
            location,
            target,
            falloffExponent,
            cutoffAngle,
            lightColor,
            surfaceScale,
            kd,
            null, // Use source bitmap as input
            null // No crop rect
          );

          // Set the filter and blend mode
          paint.setImageFilter(spotLitFilter);
          paint.setBlendMode(ctx.BlendMode.Plus); // Additive lighting

          // Draw the image with spotlight effect
          canvas.drawImage(ctx.skiaLogoPng, 0, 0, paint);
        };

        // Main spotlight from top-right
        createSpotlight(
          { x: 600, y: 100, z: 400 },
          { x: 384, y: 384, z: 0 },
          Skia.Color("rgb(255, 220, 180)"), // Warm white
          2.5,
          30.0
        );

        // Accent light from left
        createSpotlight(
          { x: 100, y: 300, z: 300 },
          { x: 300, y: 384, z: 0 },
          Skia.Color("rgb(90, 160, 255)"), // Cool blue
          1.2,
          40.0
        );

        // Subtle rim light from below
        createSpotlight(
          { x: 384, y: 650, z: 150 },
          { x: 384, y: 500, z: 0 },
          Skia.Color("rgb(255, 100, 50)"), // Warm orange/red
          0.8,
          60.0
        );

        // Add volumetric light rays
        const raysPaint = Skia.Paint();
        raysPaint.setColor(Skia.Color("rgba(255, 230, 180, 0.2)"));

        // Primary light source position
        const lightX = 600;
        const lightY = 100;

        // Draw 12 light rays from the main spotlight
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 0.5 + Math.PI * 0.75; // Angles for right-top quadrant
          const length = 300 + 0.5 * 200;
          const endX = lightX + Math.cos(angle) * length;
          const endY = lightY + Math.sin(angle) * length;

          const rayPaint = Skia.Paint();
          rayPaint.setColor(Skia.Color("rgba(255, 230, 180, 0.1)"));
          rayPaint.setStrokeWidth(2 + 0.5 * 4);
          rayPaint.setStyle(ctx.PaintStyle.Stroke);
          rayPaint.setImageFilter(
            Skia.ImageFilter.MakeBlur(3, 3, ctx.TileMode.Decal)
          );

          canvas.drawLine(lightX, lightY, endX, endY, rayPaint);
        }

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, TileMode, BlendMode, PaintStyle }
    );
    await checkResult(
      base64,
      `lighting-image-filters/spot-lit-diffuse-${surface.OS}.png`
    );
  });

  itRunsE2eOnly("DistantLitSpecular - Metallic Gold", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeOffscreen(768, 768)!;
        const canvas = sur.getCanvas();

        // Draw a rich dark background with subtle texture
        const bgPaint = Skia.Paint();
        bgPaint.setColor(Skia.Color("rgb(25, 15, 10)"));
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Add subtle noise texture to background
        const noisePaint = Skia.Paint();

        // Use a fine turbulence noise as a background texture
        for (let y = 0; y < 768; y += 4) {
          for (let x = 0; x < 768; x += 4) {
            // Simple noise function
            const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
            const alpha = noise * 0.15; // Very subtle

            noisePaint.setColor(Skia.Color(`rgba(50, 30, 10, ${alpha})`));
            canvas.drawRect(Skia.XYWHRect(x, y, 4, 4), noisePaint);
          }
        }

        // Create our metallic gold effect
        const paint = Skia.Paint();

        // Preprocess the image with a blur and contrast enhancement
        const preprocessFilter = Skia.ImageFilter.MakeColorFilter(
          Skia.ColorFilter.MakeMatrix([
            2.0,
            0,
            0,
            0,
            -50, // High red contrast
            0,
            2.0,
            0,
            0,
            -50, // High green contrast
            0,
            0,
            2.0,
            0,
            -50, // High blue contrast
            0,
            0,
            0,
            1,
            0, // Alpha unchanged
          ]),
          Skia.ImageFilter.MakeBlur(1, 1, ctx.TileMode.Decal)
        );

        // Direction vectors for multiple lights to create more complex highlights
        const direction = { x: 0.5, y: -1, z: 0.3 };

        // Gold light color with intense highlights
        const lightColor = Skia.Color("rgb(255, 240, 180)");

        // Parameters for the filter - high shininess for gold
        const surfaceScale = 0.6; // Not too high for gold
        const ks = 0.9; // Strong specular coefficient
        const shininess = 50.0; // Very high shininess for metallic look

        // Create the distant specular filter
        const specularFilter = Skia.ImageFilter.MakeDistantLitSpecular(
          direction,
          lightColor,
          surfaceScale,
          ks,
          shininess,
          preprocessFilter, // Use enhanced image as input
          null // No crop rect
        );

        // Set the filter to our paint
        paint.setImageFilter(specularFilter);

        // Add a gold color tint
        const goldMatrix = [
          1.2,
          0.3,
          0.0,
          0,
          30, // Boost red with some green mixed in
          0.2,
          1.0,
          0.0,
          0,
          20, // Moderate green
          0.0,
          0.1,
          0.4,
          0,
          0, // Minimal blue for gold
          0,
          0,
          0,
          1,
          0, // Alpha unchanged
        ];

        const colorFilter = Skia.ColorFilter.MakeMatrix(goldMatrix);
        paint.setColorFilter(colorFilter);

        // Add a second light from another angle for more complex highlights
        const secondaryPaint = Skia.Paint();
        const secondDirection = { x: -0.5, y: -0.8, z: 0.2 };

        const secondaryFilter = Skia.ImageFilter.MakeDistantLitSpecular(
          secondDirection,
          Skia.Color("rgb(255, 255, 255)"), // White highlights
          surfaceScale * 0.5,
          ks * 0.3,
          shininess * 1.5, // Even sharper highlights
          preprocessFilter,
          null
        );

        secondaryPaint.setImageFilter(secondaryFilter);
        secondaryPaint.setBlendMode(ctx.BlendMode.Plus); // Additive blending

        // Draw with padding for a framed effect
        const padding = 40;
        const imageRect = Skia.XYWHRect(
          padding,
          padding,
          768 - padding * 2,
          768 - padding * 2
        );

        // Create an ornate frame border
        const framePaint = Skia.Paint();
        framePaint.setStyle(ctx.PaintStyle.Stroke);
        framePaint.setStrokeWidth(10);
        framePaint.setColor(Skia.Color("rgb(80, 50, 10)"));
        canvas.drawRect(
          Skia.XYWHRect(
            padding - 15,
            padding - 15,
            768 - padding * 2 + 30,
            768 - padding * 2 + 30
          ),
          framePaint
        );

        // Add gold leaf effect to frame
        const frameGoldPaint = Skia.Paint();
        frameGoldPaint.setStyle(ctx.PaintStyle.Stroke);
        frameGoldPaint.setStrokeWidth(6);
        frameGoldPaint.setColor(Skia.Color("rgb(200, 170, 40)"));
        canvas.drawRect(
          Skia.XYWHRect(
            padding - 15,
            padding - 15,
            768 - padding * 2 + 30,
            768 - padding * 2 + 30
          ),
          frameGoldPaint
        );

        // Draw the main image
        canvas.drawImageRect(
          ctx.skiaLogoPng,
          Skia.XYWHRect(
            0,
            0,
            ctx.skiaLogoPng.width(),
            ctx.skiaLogoPng.height()
          ),
          imageRect,
          paint
        );

        // Apply secondary highlights
        canvas.drawImageRect(
          ctx.skiaLogoPng,
          Skia.XYWHRect(
            0,
            0,
            ctx.skiaLogoPng.width(),
            ctx.skiaLogoPng.height()
          ),
          imageRect,
          secondaryPaint
        );

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, TileMode, BlendMode, PaintStyle }
    );
    await checkResult(
      base64,
      "lighting-image-filters/distant-lit-specular.png"
    );
  });

  itRunsE2eOnly("PointLitSpecular - Wet Surface", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeOffscreen(768, 768)!;
        const canvas = sur.getCanvas();

        // Create a dark wet-looking surface
        const bgPaint = Skia.Paint();
        const bgShader = Skia.Shader.MakeLinearGradient(
          { x: 0, y: 0 },
          { x: 768, y: 768 },
          [Skia.Color("rgb(10, 20, 30)"), Skia.Color("rgb(20, 40, 60)")],
          null,
          ctx.TileMode.Clamp
        );
        bgPaint.setShader(bgShader);
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Add water droplet texture in background
        const dropletPaint = Skia.Paint();
        dropletPaint.setColor(Skia.Color("rgba(255, 255, 255, 0.1)"));

        // Random water droplets
        const numDroplets = 200;
        for (let i = 0; i < numDroplets; i++) {
          const x = 0.5 * 768;
          const y = 0.5 * 768;
          const size = 1 + 0.5 * 5;

          // Make some droplets blurry for depth
          if (0.5 > 0.7) {
            dropletPaint.setImageFilter(
              Skia.ImageFilter.MakeBlur(
                1 + 0.5 * 2,
                1 + 0.5 * 2,
                ctx.TileMode.Decal
              )
            );
          } else {
            dropletPaint.setImageFilter(null);
          }

          canvas.drawCircle(x, y, size, dropletPaint);
        }

        // Create wet surface effect with high specularity
        const mainPaint = Skia.Paint();

        // Create the point specular light source
        const mainLight = { x: 200, y: 200, z: 300 };
        const specularFilter = Skia.ImageFilter.MakePointLitSpecular(
          mainLight,
          Skia.Color("rgb(240, 250, 255)"), // Slightly blue-white for water highlights
          1.0, // Moderate surface scale
          1.0, // Full specular strength
          80.0, // Very high shininess for wet look
          null,
          null
        );

        mainPaint.setImageFilter(specularFilter);

        // Create second light for additional highlights
        const secondaryPaint = Skia.Paint();
        const secondLight = { x: 600, y: 400, z: 400 };
        const secondFilter = Skia.ImageFilter.MakePointLitSpecular(
          secondLight,
          Skia.Color("rgb(200, 220, 255)"), // Cooler light
          0.8,
          0.7,
          100.0, // Even higher shininess
          null,
          null
        );

        secondaryPaint.setImageFilter(secondFilter);
        secondaryPaint.setBlendMode(ctx.BlendMode.Plus);

        // Create diffuse lighting for the base image
        const diffusePaint = Skia.Paint();
        const diffuseFilter = Skia.ImageFilter.MakePointLitDiffuse(
          { x: 384, y: 384, z: 300 },
          Skia.Color("rgb(150, 160, 170)"), // Soft gray-blue
          1.5,
          1.0,
          null,
          null
        );

        diffusePaint.setImageFilter(diffuseFilter);

        // Add a blue-tinted color adjustment for underwater effect
        diffusePaint.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            0.8, 0.0, 0.0, 0, 0, 0.0, 0.9, 0.1, 0, 0, 0.1, 0.1, 1.0, 0, 20, 0,
            0, 0, 1, 0,
          ])
        );

        // Draw with the base diffuse lighting first
        canvas.drawImage(ctx.skiaLogoPng, 0, 0, diffusePaint);

        // Draw with specular highlights
        canvas.drawImage(ctx.skiaLogoPng, 0, 0, mainPaint);
        canvas.drawImage(ctx.skiaLogoPng, 0, 0, secondaryPaint);

        // Add water flowing/dripping effect
        const waterStreakPaint = Skia.Paint();
        waterStreakPaint.setColor(Skia.Color("rgba(220, 230, 255, 0.15)"));

        // Create several water streaks
        for (let i = 0; i < 8; i++) {
          const startX = 50 + 0.5 * 700;
          const startY = 20 + 0.5 * 100;
          let currentX = startX;
          let currentY = startY;

          // Create a wavy downward path
          const length = 100 + 0.5 * 600;
          const segments = 10 + Math.floor(length / 30);

          const flowPathBuilder = Skia.PathBuilder.Make().moveTo(
            currentX,
            currentY
          );

          for (let j = 0; j < segments; j++) {
            // Gravity pulls downward
            currentY += length / segments;
            // Random side-to-side waviness
            currentX += (0.5 - 0.5) * 30;

            flowPathBuilder.lineTo(currentX, currentY);
          }

          const flowPath = flowPathBuilder.build();

          // Make the water streak taper and blur
          const streakPaint = Skia.Paint();
          streakPaint.setStyle(ctx.PaintStyle.Stroke);
          streakPaint.setColor(Skia.Color("rgba(200, 240, 255, 0.2)"));
          streakPaint.setStrokeWidth(1 + 0.5 * 3);
          streakPaint.setImageFilter(
            Skia.ImageFilter.MakeBlur(1, 1, ctx.TileMode.Decal)
          );

          canvas.drawPath(flowPath, streakPaint);
        }

        // Add water puddle at bottom
        const puddlePaint = Skia.Paint();
        const puddleShader = Skia.Shader.MakeLinearGradient(
          { x: 0, y: 600 },
          { x: 0, y: 768 },
          [
            Skia.Color("rgba(40, 80, 120, 0)"),
            Skia.Color("rgba(40, 80, 120, 0.4)"),
          ],
          null,
          ctx.TileMode.Clamp
        );
        puddlePaint.setShader(puddleShader);
        canvas.drawRect(Skia.XYWHRect(0, 600, 768, 168), puddlePaint);

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, BlendMode, TileMode, PaintStyle }
    );
    await checkResult(
      base64,
      `lighting-image-filters/point-lit-specular-${surface.OS}.png`
    );
  });
  itRunsE2eOnly("SpotLitSpecular - Crystal Prism", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeOffscreen(768, 768)!;
        const canvas = sur.getCanvas();

        // Create a black background for maximum contrast with crystal effect
        const bgPaint = Skia.Paint();
        bgPaint.setColor(Skia.Color("rgb(0, 0, 0)"));
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Create a "crystal prism" effect with rainbow colors

        // Draw colored ambient light beams in background
        const beamColors = [
          "rgba(255, 50, 50, 0.2)", // Red
          "rgba(255, 150, 50, 0.2)", // Orange
          "rgba(255, 255, 50, 0.2)", // Yellow
          "rgba(50, 255, 50, 0.2)", // Green
          "rgba(50, 150, 255, 0.2)", // Blue
          "rgba(150, 50, 255, 0.2)", // Purple
        ];

        // Create rainbow beams
        for (let i = 0; i < beamColors.length; i++) {
          const beamPaint = Skia.Paint();
          beamPaint.setColor(Skia.Color(beamColors[i]));

          // Calculate angle for each beam
          const angle = (i / beamColors.length) * Math.PI + Math.PI / 2;

          // End coordinates based on angle
          const endX = 384 + Math.cos(angle) * 900;
          const endY = 384 + Math.sin(angle) * 900;

          // Create beam path
          const beamPath = Skia.PathBuilder.Make()
            .moveTo(384, 384)
            .lineTo(endX, endY)
            .build();

          // Draw wide blurred beam
          beamPaint.setStyle(ctx.PaintStyle.Stroke);
          beamPaint.setStrokeWidth(60 + i * 10);
          beamPaint.setImageFilter(
            Skia.ImageFilter.MakeBlur(20, 20, ctx.TileMode.Decal)
          );

          canvas.drawPath(beamPath, beamPaint);
        }

        // Apply crystalline effect to the main image
        // First, prepare a base with enhanced contrast
        const basePaint = Skia.Paint();
        basePaint.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            1.5,
            0,
            0,
            0,
            -30, // Boosted red
            0,
            1.5,
            0,
            0,
            -30, // Boosted green
            0,
            0,
            1.5,
            0,
            -30, // Boosted blue
            0,
            0,
            0,
            1.2,
            0, // Slightly boosted alpha
          ])
        );

        // Draw base layer at reduced size to create crystal border effect
        const padding = 100;
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
          basePaint
        );

        // Now create multiple specular highlights from different angles
        // These simulate light refracting through crystal facets

        // Function to create a colored specular highlight
        const createCrystalFacet = (
          location: { x: number; y: number; z: number },
          target: { x: number; y: number; z: number },
          color: SkColor,
          cutoffAngle: number,
          shininess: number
        ) => {
          const paint = Skia.Paint();

          // Create the spotlight specular filter
          const spotLitFilter = Skia.ImageFilter.MakeSpotLitSpecular(
            location,
            target,
            3.0, // Sharp falloff
            cutoffAngle, // Narrow spotlight cone
            color, // Colored light
            1.0, // Surface scale
            0.9, // Strong specular coefficient
            shininess, // Very high shininess
            null, // Use source bitmap as input
            null // No crop rect
          );

          // Set the filter and blend mode
          paint.setImageFilter(spotLitFilter);
          paint.setBlendMode(ctx.BlendMode.Plus); // Additive lighting

          // Draw the specular highlight
          canvas.drawImageRect(
            ctx.skiaLogoPng,
            Skia.XYWHRect(
              0,
              0,
              ctx.skiaLogoPng.width(),
              ctx.skiaLogoPng.height()
            ),
            imageRect,
            paint
          );
        };

        // Create crystal facets with rainbow colors
        createCrystalFacet(
          { x: 500, y: 200, z: 300 },
          { x: 384, y: 384, z: 0 },
          Skia.Color("rgb(255, 50, 50)"), // Red
          25.0,
          100.0
        );

        createCrystalFacet(
          { x: 200, y: 600, z: 300 },
          { x: 300, y: 384, z: 0 },
          Skia.Color("rgb(255, 150, 50)"), // Orange
          30.0,
          120.0
        );

        createCrystalFacet(
          { x: 600, y: 600, z: 300 },
          { x: 500, y: 400, z: 0 },
          Skia.Color("rgb(255, 255, 50)"), // Yellow
          20.0,
          150.0
        );

        createCrystalFacet(
          { x: 200, y: 200, z: 300 },
          { x: 300, y: 300, z: 0 },
          Skia.Color("rgb(50, 255, 50)"), // Green
          15.0,
          200.0
        );

        createCrystalFacet(
          { x: 400, y: 100, z: 300 },
          { x: 400, y: 300, z: 0 },
          Skia.Color("rgb(50, 150, 255)"), // Blue
          25.0,
          180.0
        );

        createCrystalFacet(
          { x: 700, y: 384, z: 300 },
          { x: 500, y: 384, z: 0 },
          Skia.Color("rgb(150, 50, 255)"), // Purple
          20.0,
          160.0
        );

        // Add intense white highlights for sharp crystal edges
        createCrystalFacet(
          { x: 384, y: 100, z: 400 },
          { x: 384, y: 384, z: 0 },
          Skia.Color("rgb(255, 255, 255)"), // Pure white
          10.0,
          250.0
        );

        // Add crystal border effect
        const borderPaint = Skia.Paint();

        // Create an irregular crystal shape around the image
        const centerX = 384;
        const centerY = 384;
        const facets = 12;

        // Create a crystal-like faceted border
        const borderPathBuilder = Skia.PathBuilder.Make().moveTo(
          centerX + (padding - 20) * Math.cos(0),
          centerY + (padding - 20) * Math.sin(0)
        );

        for (let i = 1; i <= facets; i++) {
          const angle = (i / facets) * Math.PI * 2;

          // Vary the radius for each facet
          const radiusVariation = 30 + 0.5 * 40;
          const radius = padding - 20 + radiusVariation;

          borderPathBuilder.lineTo(
            centerX + radius * Math.cos(angle),
            centerY + radius * Math.sin(angle)
          );
        }

        const borderPath = borderPathBuilder.close().build();

        // Draw crystal border with gradient effect
        const borderShader = Skia.Shader.MakeLinearGradient(
          { x: 0, y: 0 },
          { x: 768, y: 768 },
          [
            Skia.Color("rgba(220, 240, 255, 0.6)"),
            Skia.Color("rgba(180, 220, 255, 0.3)"),
            Skia.Color("rgba(150, 200, 255, 0.6)"),
          ],
          null,
          ctx.TileMode.Clamp
        );

        borderPaint.setShader(borderShader);
        borderPaint.setStyle(ctx.PaintStyle.Stroke);
        borderPaint.setStrokeWidth(30);
        borderPaint.setImageFilter(
          Skia.ImageFilter.MakeBlur(8, 8, ctx.TileMode.Decal)
        );

        canvas.drawPath(borderPath, borderPaint);

        // Add some star-shaped highlights
        const starPaint = Skia.Paint();
        starPaint.setColor(Skia.Color("rgb(255, 255, 255)"));

        const createStar = (x: number, y: number, size: number) => {
          // Draw 4-point star
          const starPath = Skia.PathBuilder.Make()
            .moveTo(x, y - size)
            .lineTo(x + size / 4, y - size / 4)
            .lineTo(x + size, y)
            .lineTo(x + size / 4, y + size / 4)
            .lineTo(x, y + size)
            .lineTo(x - size / 4, y + size / 4)
            .lineTo(x - size, y)
            .lineTo(x - size / 4, y - size / 4)
            .close()
            .build();

          // Add blur for glow
          const glowPaint = Skia.Paint();
          glowPaint.setColor(Skia.Color("rgba(255, 255, 255, 0.8)"));
          glowPaint.setImageFilter(
            Skia.ImageFilter.MakeBlur(size / 4, size / 4, ctx.TileMode.Decal)
          );

          canvas.drawPath(starPath, glowPaint);

          // Draw sharp center
          const centerPaint = Skia.Paint();
          centerPaint.setColor(Skia.Color("rgb(255, 255, 255)"));
          canvas.drawCircle(x, y, size / 10, centerPaint);
        };

        // Add several highlight stars
        createStar(150, 200, 20);
        createStar(600, 150, 15);
        createStar(500, 600, 25);
        createStar(200, 500, 18);
        createStar(350, 250, 12);

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, BlendMode, TileMode, PaintStyle }
    );
    await checkResult(
      base64,
      `lighting-image-filters/spot-lit-specular-${surface.OS}.png`
    );
  });

  itRunsE2eOnly("Combined Lighting - Elemental Fire & Ice", async () => {
    const { skiaLogoPng } = images;
    const base64 = await surface.eval(
      (Skia, ctx) => {
        const sur = Skia.Surface.MakeOffscreen(768, 768)!;
        const canvas = sur.getCanvas();

        // Fill with dark background
        const bgPaint = Skia.Paint();
        bgPaint.setColor(Skia.Color("rgb(5, 10, 20)"));
        canvas.drawRect(Skia.XYWHRect(0, 0, 768, 768), bgPaint);

        // Create a split-screen effect with fire and ice

        // First, create a mask for each half
        const leftMask = Skia.Path.Rect(Skia.XYWHRect(0, 0, 384, 768));
        const rightMask = Skia.Path.Rect(Skia.XYWHRect(384, 0, 384, 768));

        // Prepare the image with enhanced contrast
        const preprocessFilter = Skia.ImageFilter.MakeColorFilter(
          Skia.ColorFilter.MakeMatrix([
            1.8,
            0,
            0,
            0,
            -40, // High contrast red
            0,
            1.8,
            0,
            0,
            -40, // High contrast green
            0,
            0,
            1.8,
            0,
            -40, // High contrast blue
            0,
            0,
            0,
            1.2,
            0, // Slightly boosted alpha
          ]),
          Skia.ImageFilter.MakeBlur(1, 1, ctx.TileMode.Decal)
        );

        // ******** FIRE SIDE (LEFT) ********
        canvas.save();
        canvas.clipPath(leftMask, ctx.ClipOp.Intersect, true);

        // Create fiery background
        const fireBgPaint = Skia.Paint();
        const fireShader = Skia.Shader.MakeLinearGradient(
          { x: 0, y: 768 },
          { x: 384, y: 0 },
          [
            Skia.Color("rgb(80, 0, 0)"),
            Skia.Color("rgb(180, 30, 0)"),
            Skia.Color("rgb(255, 150, 0)"),
          ],
          [0.2, 0.5, 0.9],
          ctx.TileMode.Clamp
        );
        fireBgPaint.setShader(fireShader);
        canvas.drawRect(Skia.XYWHRect(0, 0, 384, 768), fireBgPaint);

        // Draw stylized flames in background
        const drawFlame = (
          x: number,
          y: number,
          width: number,
          height: number
        ) => {
          // Define control points for bezier curve
          const flamePath = Skia.PathBuilder.Make()
            // Start at bottom center
            .moveTo(x, y + height)
            // Left side of flame
            .cubicTo(
              x - width * 0.5,
              y + height * 0.7, // Control point 1
              x - width * 0.2,
              y + height * 0.3, // Control point 2
              x,
              y // End point (top of flame)
            )
            // Right side of flame
            .cubicTo(
              x + width * 0.2,
              y + height * 0.3, // Control point 1
              x + width * 0.5,
              y + height * 0.7, // Control point 2
              x,
              y + height // End point (back to start)
            )
            .build();

          // Fill with gradient
          const flamePaint = Skia.Paint();
          const flameShader = Skia.Shader.MakeLinearGradient(
            { x: x, y: y + height },
            { x: x, y: y },
            [
              Skia.Color("rgb(255, 60, 0)"),
              Skia.Color("rgb(255, 150, 0)"),
              Skia.Color("rgb(255, 220, 120)"),
            ],
            [0.2, 0.6, 0.9],
            ctx.TileMode.Clamp
          );
          flamePaint.setShader(flameShader);

          // Add glow with blur
          flamePaint.setImageFilter(
            Skia.ImageFilter.MakeBlur(
              width * 0.1,
              width * 0.1,
              ctx.TileMode.Decal
            )
          );

          canvas.drawPath(flamePath, flamePaint);
        };

        // Draw multiple flames
        for (let i = 0; i < 8; i++) {
          const x = 50 + 0.5 * 300;
          const baseHeight = 200 + 0.5 * 300;
          drawFlame(x, 768 - baseHeight, 20 + 0.5 * 50, baseHeight);
        }

        // Create fire lighting with composite of diffuse and specular

        // Create fiery diffuse lighting from below
        const fireLight = { x: 200, y: 700, z: 100 };
        const fireColor = Skia.Color("rgb(255, 180, 50)");

        const fireDiffuseFilter = Skia.ImageFilter.MakePointLitDiffuse(
          fireLight,
          fireColor,
          2.0, // Exaggerated surface scale
          2.0, // Strong diffuse
          preprocessFilter, // Use preprocessed image
          null
        );

        // Create specular highlights for embers and sparks
        const fireSpecularFilter = Skia.ImageFilter.MakePointLitSpecular(
          { x: 150, y: 550, z: 200 },
          Skia.Color("rgb(255, 230, 150)"),
          1.0,
          0.7,
          50.0, // High shininess for sparks
          preprocessFilter,
          null
        );

        // Combine diffuse and specular with Plus blending
        const fireFilter = Skia.ImageFilter.MakeBlend(
          ctx.BlendMode.Plus,
          fireDiffuseFilter,
          fireSpecularFilter
        );

        // Create the fire paint
        const firePaint = Skia.Paint();
        firePaint.setImageFilter(fireFilter);

        // Add fiery color tint
        firePaint.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            1.5,
            0.3,
            0.1,
            0,
            20, // Strong red
            0.2,
            1.0,
            0.1,
            0,
            0, // Moderate green
            0.0,
            0.1,
            0.5,
            0,
            -20, // Reduced blue
            0,
            0,
            0,
            1,
            0, // Alpha unchanged
          ])
        );

        // Draw the image with fire effect
        canvas.drawImage(ctx.skiaLogoPng, 0, 0, firePaint);

        // Add ember particles
        const emberPaint = Skia.Paint();

        for (let i = 0; i < 60; i++) {
          const x = 0.5 * 384;
          const y = 300 + 0.5 * 468;
          const size = 1 + 0.5 * 3;

          const brightness = 150 + 0.5 * 105;
          emberPaint.setColor(
            Skia.Color(`rgba(${brightness}, ${brightness * 0.6}, 0, 0.8)`)
          );

          // Add glow to some embers
          if (0.5 > 0.6) {
            emberPaint.setImageFilter(
              Skia.ImageFilter.MakeBlur(size * 2, size * 2, ctx.TileMode.Decal)
            );
          } else {
            emberPaint.setImageFilter(null);
          }

          canvas.drawCircle(x, y, size, emberPaint);
        }

        canvas.restore();

        // ******** ICE SIDE (RIGHT) ********
        canvas.save();
        canvas.clipPath(rightMask, ctx.ClipOp.Intersect, true);

        // Create icy background
        const iceBgPaint = Skia.Paint();
        const iceShader = Skia.Shader.MakeLinearGradient(
          { x: 768, y: 768 },
          { x: 384, y: 0 },
          [
            Skia.Color("rgb(0, 20, 50)"),
            Skia.Color("rgb(30, 70, 120)"),
            Skia.Color("rgb(180, 220, 255)"),
          ],
          [0.2, 0.5, 0.9],
          ctx.TileMode.Clamp
        );
        iceBgPaint.setShader(iceShader);
        canvas.drawRect(Skia.XYWHRect(384, 0, 384, 768), iceBgPaint);

        // Draw ice crystals in background
        const drawCrystal = (
          x: number,
          y: number,
          size: number,
          rotation: number
        ) => {
          const crystalPaint = Skia.Paint();
          crystalPaint.setColor(Skia.Color("rgba(200, 230, 255, 0.4)"));

          // Save canvas state for rotation
          canvas.save();
          canvas.translate(x, y);
          canvas.rotate(rotation, 0, 0);

          // Draw crystal shape
          const crystalPath = Skia.PathBuilder.Make()
            .moveTo(0, -size) // Top
            .lineTo(size / 3, -size / 2) // Upper right
            .lineTo(size / 2, size / 2) // Lower right
            .lineTo(0, size) // Bottom
            .lineTo(-size / 2, size / 2) // Lower left
            .lineTo(-size / 3, -size / 2) // Upper left
            .close()
            .build();

          // Add light refraction effect
          crystalPaint.setImageFilter(
            Skia.ImageFilter.MakeBlur(
              size * 0.1,
              size * 0.1,
              ctx.TileMode.Decal
            )
          );

          canvas.drawPath(crystalPath, crystalPaint);

          // Add highlight
          const highlightPaint = Skia.Paint();
          highlightPaint.setColor(Skia.Color("rgba(255, 255, 255, 0.7)"));

          const highlightPath = Skia.PathBuilder.Make()
            .moveTo(0, -size * 0.8)
            .lineTo(size / 5, -size / 3)
            .lineTo(-size / 5, -size / 3)
            .close()
            .build();

          canvas.drawPath(highlightPath, highlightPaint);

          // Restore canvas
          canvas.restore();
        };

        // Draw multiple crystals
        for (let i = 0; i < 15; i++) {
          const x = 384 + 0.5 * 384;
          const y = 0.5 * 768;
          const size = 20 + 0.5 * 60;
          const rotation = 0.5 * 360;

          drawCrystal(x, y, size, rotation);
        }

        // Create ice lighting with diffuse and specular

        // Create ice diffuse lighting from top
        const iceLight = { x: 600, y: 100, z: 200 };
        const iceColor = Skia.Color("rgb(200, 230, 255)");

        const iceDiffuseFilter = Skia.ImageFilter.MakePointLitDiffuse(
          iceLight,
          iceColor,
          1.5, // Moderate surface scale
          1.2, // Strong diffuse
          preprocessFilter, // Use preprocessed image
          null
        );

        // Create specular highlights for ice crystals
        const iceSpecularFilter = Skia.ImageFilter.MakePointLitSpecular(
          { x: 620, y: 200, z: 300 },
          Skia.Color("rgb(240, 250, 255)"),
          1.0,
          0.8,
          80.0, // Very high shininess for ice
          preprocessFilter,
          null
        );

        // Combine diffuse and specular with Screen blending
        const iceFilter = Skia.ImageFilter.MakeBlend(
          ctx.BlendMode.Screen,
          iceDiffuseFilter,
          iceSpecularFilter
        );

        // Create the ice paint
        const icePaint = Skia.Paint();
        icePaint.setImageFilter(iceFilter);

        // Add icy color tint
        icePaint.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            0.7,
            0.0,
            0.0,
            0,
            -20, // Reduced red
            0.0,
            0.9,
            0.2,
            0,
            0, // Boosted green slightly
            0.2,
            0.3,
            1.2,
            0,
            30, // Strong blue
            0,
            0,
            0,
            1,
            0, // Alpha unchanged
          ])
        );

        // Draw the image with ice effect
        canvas.drawImage(ctx.skiaLogoPng, 0, 0, icePaint);

        // Add snowflake particles
        const snowPaint = Skia.Paint();
        snowPaint.setColor(Skia.Color("rgba(255, 255, 255, 0.8)"));

        for (let i = 0; i < 60; i++) {
          const x = 384 + 0.5 * 384;
          const y = 0.5 * 768;
          const size = 1 + 0.5 * 3;

          // Add glow to some snowflakes
          if (0.5 > 0.7) {
            snowPaint.setImageFilter(
              Skia.ImageFilter.MakeBlur(size * 2, size * 2, ctx.TileMode.Decal)
            );
            canvas.drawCircle(x, y, size * 1.5, snowPaint);
          } else {
            snowPaint.setImageFilter(null);
            canvas.drawCircle(x, y, size, snowPaint);
          }
        }

        canvas.restore();

        // Draw dividing line with glowing effect
        const dividerPaint = Skia.Paint();
        const dividerShader = Skia.Shader.MakeLinearGradient(
          { x: 384 - 20, y: 0 },
          { x: 384 + 20, y: 0 },
          [
            Skia.Color("rgba(255, 120, 0, 0.7)"),
            Skia.Color("rgba(255, 255, 255, 1.0)"),
            Skia.Color("rgba(100, 180, 255, 0.7)"),
          ],
          [0.0, 0.5, 1.0],
          ctx.TileMode.Clamp
        );
        dividerPaint.setShader(dividerShader);
        dividerPaint.setImageFilter(
          Skia.ImageFilter.MakeBlur(10, 10, ctx.TileMode.Decal)
        );

        canvas.drawRect(Skia.XYWHRect(384 - 5, 0, 10, 768), dividerPaint);

        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      { skiaLogoPng, BlendMode, TileMode, PaintStyle, ClipOp }
    );
    await checkResult(
      base64,
      `lighting-image-filters/combined-lighting-fire-ice-${surface.OS}.png`
    );
  });
});
