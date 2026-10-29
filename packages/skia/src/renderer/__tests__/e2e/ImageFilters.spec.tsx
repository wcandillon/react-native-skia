import React from "react";

import {
  docPath,
  checkImage,
  itRunsNodeOnly,
  itRunsE2eOnly,
  CI,
  processResult,
} from "../../../__tests__/setup";
import {
  fonts,
  images,
  surface,
  width as wWidth,
  height as wHeight,
} from "../setup";
import {
  Fill,
  Image,
  Morphology,
  Offset,
  Path,
  RoundedRect,
  Shadow,
  Text,
  DisplacementMap,
  Turbulence,
} from "../../components";
import { setupSkia } from "../../../skia/__tests__/setup";
import {
  BlendMode,
  TileMode,
  type SkColor,
  type Skia,
  type SkImageFilter,
} from "../../../skia/types";

const Black = Float32Array.of(0, 0, 0, 1);

const MakeInnerShadow = (
  Skia: Skia,
  shadowOnly: boolean | undefined,
  dx: number,
  dy: number,
  sigmaX: number,
  sigmaY: number,
  color: SkColor,
  input: SkImageFilter | null
) => {
  "worklet";
  const sourceGraphic = Skia.ImageFilter.MakeColorFilter(
    Skia.ColorFilter.MakeBlend(Black, BlendMode.Dst),
    null
  );
  const sourceAlpha = Skia.ImageFilter.MakeColorFilter(
    Skia.ColorFilter.MakeBlend(Black, BlendMode.SrcIn),
    null
  );
  const f1 = Skia.ImageFilter.MakeColorFilter(
    Skia.ColorFilter.MakeBlend(color, BlendMode.SrcOut),
    null
  );
  const f2 = Skia.ImageFilter.MakeOffset(dx, dy, f1);
  const f3 = Skia.ImageFilter.MakeBlur(sigmaX, sigmaY, TileMode.Decal, f2);
  const f4 = Skia.ImageFilter.MakeBlend(BlendMode.SrcIn, sourceAlpha, f3);
  if (shadowOnly) {
    return f4;
  }
  return Skia.ImageFilter.MakeCompose(
    input,
    Skia.ImageFilter.MakeBlend(BlendMode.SrcOver, sourceGraphic, f4)
  );
};

describe("Test Image Filters", () => {
  itRunsNodeOnly(
    "Should display the text the same way everywhere",
    async () => {
      const font = fonts.RobotoMedium;
      const { width } = surface;
      const x = width / 8;
      const image = await surface.draw(
        <>
          <Fill color="white" />
          <Text text="Hello World" x={x} y={x} font={font} />
        </>
      );
      checkImage(image, docPath("image-filters/regular-text.png"));
    }
  );
  itRunsNodeOnly("Should change the text morphology", async () => {
    const font = fonts.RobotoMedium;
    const { width } = surface;
    const x = width / 8;
    const y = x;
    const y1 = 2 * y;
    const y2 = 3 * y;
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Text text="Hello World" x={x} y={y} font={font} />
        <Text text="Hello World" x={x} y={y1} font={font}>
          <Morphology radius={1} />
        </Text>
        <Text text="Hello World" x={x} y={y2} font={font}>
          <Morphology radius={0.3} operator="erode" />
        </Text>
      </>
    );
    checkImage(image, docPath("image-filters/morphology.png"));
  });
  it("Should offset the image", async () => {
    const { oslo } = images;
    const { width, height } = surface;
    const img = await surface.draw(
      <>
        <Fill color="lightblue" />
        <Image
          image={oslo}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="cover"
        >
          <Offset x={width / 4} y={width / 4} />
        </Image>
      </>
    );
    checkImage(img, docPath("image-filters/offset.png"));
  });
  // This test should fail because it is not scaled properly but
  // it passes because of the low tolerance in the canvas result
  it("Should draw a dropshadow", async () => {
    const { width } = surface;
    const padding = width / 8;
    const img = await surface.draw(
      <>
        <Fill color="lightblue" />
        <RoundedRect
          x={padding}
          y={padding}
          width={width - 2 * padding}
          height={width - 2 * padding}
          r={padding}
          color="lightblue"
        >
          <Shadow dx={36 / 3} dy={36 / 3} blur={75 / 3} color="#93b8c4" />
          <Shadow dx={-36 / 3} dy={-36 / 3} blur={75 / 3} color="#c7f8ff" />
        </RoundedRect>
      </>
    );
    checkImage(img, docPath("image-filters/dropshadow.png"), {
      threshold: 0.05,
    });
  });
  it("Should draw a dropshadow only", async () => {
    const { width } = surface;
    const padding = width / 8;
    const img = await surface.draw(
      <>
        <Fill color="cyan" />
        <RoundedRect
          x={padding}
          y={padding}
          width={width - 2 * padding}
          height={width - 2 * padding}
          r={padding}
          color="yellow"
        >
          <Shadow
            dx={-36 / 3}
            dy={-36 / 3}
            blur={75 / 3}
            color="magenta"
            shadowOnly
          />
        </RoundedRect>
      </>
    );
    checkImage(img, docPath("image-filters/dropshadow-only.png"), {
      threshold: 0.05,
    });
  });
  // This test should fail because it is not scaled properly but
  // it passes because of the low tolerance in the canvas result
  it("Should draw a innershadow", async () => {
    const { width } = surface;
    const padding = width / 8;
    const img = await surface.draw(
      <>
        <Fill color="lightblue" />
        <RoundedRect
          x={padding}
          y={padding}
          width={width - 2 * padding}
          height={width - 2 * padding}
          r={padding}
          color="lightblue"
        >
          <Shadow dx={36 / 3} dy={36 / 3} blur={75 / 3} color="#93b8c4" inner />
          <Shadow
            dx={-36 / 3}
            dy={-36 / 3}
            blur={75 / 3}
            color="#c7f8ff"
            inner
          />
        </RoundedRect>
      </>
    );
    checkImage(img, docPath("image-filters/innershadow.png"), {
      threshold: 0.05,
    });
  });
  it("Should draw a innershadow with only the shadow", async () => {
    const { width } = surface;
    const padding = width / 8;
    const img = await surface.draw(
      <>
        <Fill color="cyan" />
        <RoundedRect
          x={padding}
          y={padding}
          width={width - 2 * padding}
          height={width - 2 * padding}
          r={padding}
          color="yellow"
        >
          <Shadow
            dx={-36 / 3}
            dy={-36 / 3}
            blur={75 / 3}
            color="magenta"
            inner
            shadowOnly
          />
        </RoundedRect>
      </>
    );
    checkImage(img, docPath("image-filters/innershadow-only.png"), {
      threshold: 0.05,
    });
  });
  it("should build reference result outer and inner shadows on text", () => {
    const { surface: ckSurface, canvas, Skia } = setupSkia(wWidth, wHeight);
    const path = Skia.Path.MakeFromSVGString(
      "M62.477 2.273V75h-8.522L14.324 17.898h-.71V75H4.807V2.273h8.522l39.773 57.244h.71V2.273h8.665ZM78.963 75V20.454h8.381V75h-8.38Zm4.262-63.636c-1.634 0-3.042-.557-4.226-1.67-1.16-1.112-1.74-2.45-1.74-4.012 0-1.563.58-2.9 1.74-4.013C80.183.556 81.59 0 83.225 0c1.633 0 3.03.556 4.19 1.669 1.184 1.113 1.776 2.45 1.776 4.013 0 1.562-.592 2.9-1.776 4.013-1.16 1.112-2.557 1.669-4.19 1.669ZM124.853 76.136c-5.114 0-9.517-1.207-13.21-3.622-3.693-2.415-6.534-5.74-8.523-9.978-1.989-4.238-2.983-9.08-2.983-14.525 0-5.54 1.018-10.428 3.054-14.666 2.06-4.261 4.924-7.587 8.594-9.979 3.693-2.414 8.002-3.622 12.926-3.622 3.835 0 7.292.71 10.369 2.131 3.078 1.42 5.599 3.41 7.564 5.966 1.965 2.557 3.184 5.54 3.658 8.949h-8.381c-.639-2.486-2.059-4.688-4.261-6.605-2.178-1.942-5.114-2.912-8.807-2.912-3.267 0-6.132.852-8.594 2.556-2.438 1.681-4.344 4.06-5.717 7.138-1.35 3.054-2.024 6.641-2.024 10.76 0 4.214.663 7.884 1.988 11.009 1.35 3.125 3.244 5.551 5.682 7.28 2.462 1.728 5.351 2.592 8.665 2.592 2.178 0 4.155-.379 5.93-1.136a12.23 12.23 0 0 0 4.51-3.267c1.231-1.42 2.107-3.125 2.628-5.114h8.381c-.474 3.22-1.646 6.12-3.516 8.7-1.846 2.557-4.297 4.593-7.351 6.108-3.03 1.492-6.557 2.237-10.582 2.237ZM181.423 76.136c-5.256 0-9.79-1.16-13.601-3.48-3.788-2.344-6.712-5.61-8.772-9.8-2.036-4.215-3.054-9.116-3.054-14.703s1.018-10.511 3.054-14.772c2.06-4.285 4.925-7.623 8.594-10.015 3.693-2.414 8.002-3.622 12.926-3.622 2.841 0 5.647.474 8.417 1.42 2.769.948 5.291 2.487 7.563 4.617 2.273 2.107 4.084 4.9 5.434 8.38 1.349 3.481 2.024 7.766 2.024 12.856v3.551h-42.046v-7.244h33.523c0-3.078-.615-5.824-1.847-8.239-1.207-2.415-2.935-4.32-5.184-5.717-2.226-1.397-4.853-2.095-7.884-2.095-3.338 0-6.226.828-8.664 2.486a16.35 16.35 0 0 0-5.576 6.392c-1.302 2.627-1.953 5.445-1.953 8.451v4.83c0 4.12.71 7.611 2.131 10.476 1.444 2.84 3.444 5.007 6.001 6.498 2.557 1.468 5.528 2.202 8.914 2.202 2.201 0 4.19-.308 5.965-.923 1.8-.64 3.35-1.587 4.652-2.841 1.303-1.279 2.309-2.865 3.019-4.759l8.097 2.273a17.965 17.965 0 0 1-4.297 7.244c-2.013 2.06-4.498 3.67-7.458 4.83-2.959 1.136-6.285 1.704-9.978 1.704ZM32.648 123.273h8.806v51.988c0 4.641-.852 8.582-2.556 11.826-1.705 3.243-4.108 5.705-7.21 7.386-3.1 1.681-6.758 2.521-10.972 2.521-3.977 0-7.517-.722-10.618-2.166-3.101-1.468-5.54-3.551-7.315-6.25-1.776-2.699-2.664-5.907-2.664-9.623h8.665c0 2.059.51 3.858 1.527 5.397 1.042 1.515 2.462 2.699 4.261 3.551 1.8.853 3.848 1.279 6.144 1.279 2.533 0 4.687-.533 6.463-1.598 1.776-1.066 3.125-2.628 4.048-4.688.947-2.083 1.42-4.628 1.42-7.635v-51.988ZM80.126 197.136c-4.924 0-9.244-1.172-12.961-3.515-3.693-2.344-6.582-5.623-8.665-9.837-2.06-4.214-3.09-9.138-3.09-14.773 0-5.681 1.03-10.641 3.09-14.879 2.083-4.238 4.972-7.528 8.665-9.872 3.717-2.344 8.037-3.516 12.961-3.516 4.925 0 9.233 1.172 12.927 3.516 3.716 2.344 6.605 5.634 8.664 9.872 2.084 4.238 3.125 9.198 3.125 14.879 0 5.635-1.041 10.559-3.125 14.773-2.06 4.214-4.948 7.493-8.664 9.837-3.694 2.343-8.002 3.515-12.927 3.515Zm0-7.528c3.741 0 6.819-.959 9.233-2.876 2.415-1.918 4.203-4.439 5.363-7.564 1.16-3.125 1.74-6.511 1.74-10.157 0-3.645-.58-7.043-1.74-10.191-1.16-3.149-2.948-5.694-5.363-7.635-2.414-1.942-5.492-2.912-9.233-2.912-3.74 0-6.818.97-9.233 2.912-2.414 1.941-4.202 4.486-5.362 7.635-1.16 3.148-1.74 6.546-1.74 10.191 0 3.646.58 7.032 1.74 10.157 1.16 3.125 2.948 5.646 5.362 7.564 2.415 1.917 5.493 2.876 9.233 2.876ZM118.772 196v-72.727h8.38v26.846h.711c.615-.947 1.467-2.154 2.556-3.622 1.113-1.491 2.699-2.817 4.759-3.977 2.083-1.184 4.9-1.776 8.452-1.776 4.592 0 8.641 1.149 12.145 3.445 3.503 2.296 6.238 5.552 8.203 9.766 1.965 4.214 2.947 9.185 2.947 14.914 0 5.777-.982 10.784-2.947 15.022-1.965 4.214-4.688 7.481-8.168 9.801-3.48 2.296-7.493 3.444-12.038 3.444-3.504 0-6.31-.58-8.417-1.74-2.107-1.183-3.728-2.521-4.865-4.012-1.136-1.516-2.012-2.77-2.627-3.765h-.995V196h-8.096Zm8.238-27.273c0 4.12.604 7.754 1.811 10.902 1.208 3.125 2.971 5.576 5.292 7.351 2.32 1.752 5.161 2.628 8.522 2.628 3.504 0 6.428-.923 8.772-2.77 2.367-1.87 4.143-4.38 5.326-7.528 1.208-3.173 1.811-6.7 1.811-10.583 0-3.835-.591-7.291-1.775-10.369-1.16-3.101-2.924-5.552-5.291-7.351-2.344-1.823-5.292-2.734-8.843-2.734-3.409 0-6.273.864-8.593 2.592-2.321 1.705-4.072 4.096-5.256 7.173-1.184 3.054-1.776 6.617-1.776 10.689ZM190.824 123.273l-.71 52.272h-8.239l-.71-52.272h9.659Zm-4.829 73.295c-1.752 0-3.256-.627-4.51-1.882-1.255-1.255-1.882-2.758-1.882-4.51 0-1.752.627-3.255 1.882-4.51 1.254-1.255 2.758-1.882 4.51-1.882 1.752 0 3.255.627 4.51 1.882 1.254 1.255 1.882 2.758 1.882 4.51a6.02 6.02 0 0 1-.888 3.196 6.634 6.634 0 0 1-2.308 2.344c-.947.568-2.013.852-3.196.852Z"
    )!;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#add8e6"));
    canvas.drawPaint(paint);
    paint.setColor(Skia.Color("red"));
    const img1 = MakeInnerShadow(
      Skia,
      false,
      0,
      4,
      1,
      1,
      Skia.Color("#00FF00"),
      null
    );
    const img2 = Skia.ImageFilter.MakeDropShadow(
      0,
      4,
      0,
      0,
      Skia.Color("#0000ff"),
      null
    );
    paint.setImageFilter(Skia.ImageFilter.MakeCompose(img1, img2));
    canvas.scale(3, 3);
    canvas.drawPath(path, paint);
    canvas.restore();
    processResult(ckSurface, "snapshots/image-filter/test-shadow.png");
  });
  it("should show outer and inner shadows on text", async () => {
    const path =
      "M62.477 2.273V75h-8.522L14.324 17.898h-.71V75H4.807V2.273h8.522l39.773 57.244h.71V2.273h8.665ZM78.963 75V20.454h8.381V75h-8.38Zm4.262-63.636c-1.634 0-3.042-.557-4.226-1.67-1.16-1.112-1.74-2.45-1.74-4.012 0-1.563.58-2.9 1.74-4.013C80.183.556 81.59 0 83.225 0c1.633 0 3.03.556 4.19 1.669 1.184 1.113 1.776 2.45 1.776 4.013 0 1.562-.592 2.9-1.776 4.013-1.16 1.112-2.557 1.669-4.19 1.669ZM124.853 76.136c-5.114 0-9.517-1.207-13.21-3.622-3.693-2.415-6.534-5.74-8.523-9.978-1.989-4.238-2.983-9.08-2.983-14.525 0-5.54 1.018-10.428 3.054-14.666 2.06-4.261 4.924-7.587 8.594-9.979 3.693-2.414 8.002-3.622 12.926-3.622 3.835 0 7.292.71 10.369 2.131 3.078 1.42 5.599 3.41 7.564 5.966 1.965 2.557 3.184 5.54 3.658 8.949h-8.381c-.639-2.486-2.059-4.688-4.261-6.605-2.178-1.942-5.114-2.912-8.807-2.912-3.267 0-6.132.852-8.594 2.556-2.438 1.681-4.344 4.06-5.717 7.138-1.35 3.054-2.024 6.641-2.024 10.76 0 4.214.663 7.884 1.988 11.009 1.35 3.125 3.244 5.551 5.682 7.28 2.462 1.728 5.351 2.592 8.665 2.592 2.178 0 4.155-.379 5.93-1.136a12.23 12.23 0 0 0 4.51-3.267c1.231-1.42 2.107-3.125 2.628-5.114h8.381c-.474 3.22-1.646 6.12-3.516 8.7-1.846 2.557-4.297 4.593-7.351 6.108-3.03 1.492-6.557 2.237-10.582 2.237ZM181.423 76.136c-5.256 0-9.79-1.16-13.601-3.48-3.788-2.344-6.712-5.61-8.772-9.8-2.036-4.215-3.054-9.116-3.054-14.703s1.018-10.511 3.054-14.772c2.06-4.285 4.925-7.623 8.594-10.015 3.693-2.414 8.002-3.622 12.926-3.622 2.841 0 5.647.474 8.417 1.42 2.769.948 5.291 2.487 7.563 4.617 2.273 2.107 4.084 4.9 5.434 8.38 1.349 3.481 2.024 7.766 2.024 12.856v3.551h-42.046v-7.244h33.523c0-3.078-.615-5.824-1.847-8.239-1.207-2.415-2.935-4.32-5.184-5.717-2.226-1.397-4.853-2.095-7.884-2.095-3.338 0-6.226.828-8.664 2.486a16.35 16.35 0 0 0-5.576 6.392c-1.302 2.627-1.953 5.445-1.953 8.451v4.83c0 4.12.71 7.611 2.131 10.476 1.444 2.84 3.444 5.007 6.001 6.498 2.557 1.468 5.528 2.202 8.914 2.202 2.201 0 4.19-.308 5.965-.923 1.8-.64 3.35-1.587 4.652-2.841 1.303-1.279 2.309-2.865 3.019-4.759l8.097 2.273a17.965 17.965 0 0 1-4.297 7.244c-2.013 2.06-4.498 3.67-7.458 4.83-2.959 1.136-6.285 1.704-9.978 1.704ZM32.648 123.273h8.806v51.988c0 4.641-.852 8.582-2.556 11.826-1.705 3.243-4.108 5.705-7.21 7.386-3.1 1.681-6.758 2.521-10.972 2.521-3.977 0-7.517-.722-10.618-2.166-3.101-1.468-5.54-3.551-7.315-6.25-1.776-2.699-2.664-5.907-2.664-9.623h8.665c0 2.059.51 3.858 1.527 5.397 1.042 1.515 2.462 2.699 4.261 3.551 1.8.853 3.848 1.279 6.144 1.279 2.533 0 4.687-.533 6.463-1.598 1.776-1.066 3.125-2.628 4.048-4.688.947-2.083 1.42-4.628 1.42-7.635v-51.988ZM80.126 197.136c-4.924 0-9.244-1.172-12.961-3.515-3.693-2.344-6.582-5.623-8.665-9.837-2.06-4.214-3.09-9.138-3.09-14.773 0-5.681 1.03-10.641 3.09-14.879 2.083-4.238 4.972-7.528 8.665-9.872 3.717-2.344 8.037-3.516 12.961-3.516 4.925 0 9.233 1.172 12.927 3.516 3.716 2.344 6.605 5.634 8.664 9.872 2.084 4.238 3.125 9.198 3.125 14.879 0 5.635-1.041 10.559-3.125 14.773-2.06 4.214-4.948 7.493-8.664 9.837-3.694 2.343-8.002 3.515-12.927 3.515Zm0-7.528c3.741 0 6.819-.959 9.233-2.876 2.415-1.918 4.203-4.439 5.363-7.564 1.16-3.125 1.74-6.511 1.74-10.157 0-3.645-.58-7.043-1.74-10.191-1.16-3.149-2.948-5.694-5.363-7.635-2.414-1.942-5.492-2.912-9.233-2.912-3.74 0-6.818.97-9.233 2.912-2.414 1.941-4.202 4.486-5.362 7.635-1.16 3.148-1.74 6.546-1.74 10.191 0 3.646.58 7.032 1.74 10.157 1.16 3.125 2.948 5.646 5.362 7.564 2.415 1.917 5.493 2.876 9.233 2.876ZM118.772 196v-72.727h8.38v26.846h.711c.615-.947 1.467-2.154 2.556-3.622 1.113-1.491 2.699-2.817 4.759-3.977 2.083-1.184 4.9-1.776 8.452-1.776 4.592 0 8.641 1.149 12.145 3.445 3.503 2.296 6.238 5.552 8.203 9.766 1.965 4.214 2.947 9.185 2.947 14.914 0 5.777-.982 10.784-2.947 15.022-1.965 4.214-4.688 7.481-8.168 9.801-3.48 2.296-7.493 3.444-12.038 3.444-3.504 0-6.31-.58-8.417-1.74-2.107-1.183-3.728-2.521-4.865-4.012-1.136-1.516-2.012-2.77-2.627-3.765h-.995V196h-8.096Zm8.238-27.273c0 4.12.604 7.754 1.811 10.902 1.208 3.125 2.971 5.576 5.292 7.351 2.32 1.752 5.161 2.628 8.522 2.628 3.504 0 6.428-.923 8.772-2.77 2.367-1.87 4.143-4.38 5.326-7.528 1.208-3.173 1.811-6.7 1.811-10.583 0-3.835-.591-7.291-1.775-10.369-1.16-3.101-2.924-5.552-5.291-7.351-2.344-1.823-5.292-2.734-8.843-2.734-3.409 0-6.273.864-8.593 2.592-2.321 1.705-4.072 4.096-5.256 7.173-1.184 3.054-1.776 6.617-1.776 10.689ZM190.824 123.273l-.71 52.272h-8.239l-.71-52.272h9.659Zm-4.829 73.295c-1.752 0-3.256-.627-4.51-1.882-1.255-1.255-1.882-2.758-1.882-4.51 0-1.752.627-3.255 1.882-4.51 1.254-1.255 2.758-1.882 4.51-1.882 1.752 0 3.255.627 4.51 1.882 1.254 1.255 1.882 2.758 1.882 4.51a6.02 6.02 0 0 1-.888 3.196 6.634 6.634 0 0 1-2.308 2.344c-.947.568-2.013.852-3.196.852Z";

    const img = await surface.draw(
      <>
        <Fill color="#add8e6" />
        <Path path={path} color="red">
          <Shadow dx={0} dy={4} blur={1} color="#00FF00" inner />
          <Shadow dx={0} dy={4} blur={0} color="#0000ff" />
        </Path>
      </>
    );
    checkImage(img, "snapshots/image-filter/test-shadow.png", {
      maxPixelDiff: 1500,
    });
  });
  itRunsE2eOnly("use the displacement map as documented", async () => {
    const { oslo } = images;
    const img = await surface.draw(
      <>
        <Image
          image={oslo}
          x={0}
          y={0}
          width={surface.width}
          height={surface.height}
          fit="cover"
        >
          <DisplacementMap channelX="g" channelY="a" scale={20}>
            <Turbulence freqX={0.01} freqY={0.05} octaves={2} seed={2} />
          </DisplacementMap>
        </Image>
      </>
    );
    // on Github action the image is decoded differently and it's using a software adapter
    if (!CI) {
      checkImage(img, docPath("displacement-map.png"), { maxPixelDiff: 8000 });
    }
  });
});
