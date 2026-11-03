/* eslint-disable camelcase */
import React from "react";

import { checkImage, docPath } from "../../../__tests__/setup";
import { dataAssets, importSkia, surface } from "../setup";
import { Blur, Group, Paint, Skottie } from "../../components";

const legoLoaderJSON = require("./setup/skottie/lego_loader.json");
const drinksJSON = require("./setup/skottie/drinks.json");
const confettiJSON = require("./setup/skottie/confetti.json");
const onboardingJSON = require("./setup/skottie/onboarding.json");
const basicSlotsJSON = require("./setup/skottie/basic_slots.json");
const fingerprintJSON = require("./setup/skottie/fingerprint.json");
const textLayerJSON = require("./setup/skottie/text-layer.json");
const unnamedLayersJSON = require("./setup/skottie/unnamed-layers.json");

describe("Skottie", () => {
  it("Should render Skottie component with lego animation", async () => {
    const { Skia } = importSkia();
    const source = JSON.stringify(legoLoaderJSON);
    const legoAnimation = Skia.Skottie.Make(source);
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    legoAnimation.source = source;
    // END OF INTERNAL TESTING ONLY
    const img = await surface.draw(
      <Group transform={[{ scale: 0.5 }]}>
        <Skottie animation={legoAnimation} frame={41} />
      </Group>
    );
    await checkImage(img, docPath("skottie/skottie-component-lego.png"));
  });
  it("Should render Skottie component with raster effect", async () => {
    const { Skia } = importSkia();
    const source = JSON.stringify(legoLoaderJSON);
    const legoAnimation = Skia.Skottie.Make(source);
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    legoAnimation.source = source;
    // END OF INTERNAL TESTING ONLY
    const img = await surface.draw(
      <Group
        transform={[{ scale: 0.5 }]}
        layer={
          <Paint>
            <Blur blur={10} />
          </Paint>
        }
      >
        <Skottie animation={legoAnimation} frame={41} />
      </Group>
    );
    await checkImage(img, docPath("skottie/skottie-component-lego-blur.png"));
  });
  it("Should render Skottie component with drinks animation", async () => {
    const { Skia } = importSkia();
    const source = JSON.stringify(drinksJSON);
    const drinksAnimation = Skia.Skottie.Make(source);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    drinksAnimation.source = source;
    const img = await surface.draw(
      <Group transform={[{ scale: 0.3 }]}>
        <Skottie animation={drinksAnimation} frame={200} />
      </Group>
    );
    await checkImage(img, docPath("skottie/skottie-component-drinks.png"));
  });
  it("Should render Skottie component with confetti animation", async () => {
    const { Skia } = importSkia();
    const source = JSON.stringify(confettiJSON);
    const confettiAnimation = Skia.Skottie.Make(source);
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    confettiAnimation.source = source;
    // END OF INTERNAL TESTING ONLY
    const img = await surface.draw(
      <Group transform={[{ scale: 0.8 }]}>
        <Skottie animation={confettiAnimation} frame={30} />
      </Group>
    );
    await checkImage(img, docPath("skottie/skottie-component-confetti.png"));
  });
  it("Should render Skottie component with basic slots animation", async () => {
    const { Skia } = importSkia();
    const assets = {
      "NotoSerif": Skia.Data.fromBytes(
        new Uint8Array(Array.from(dataAssets.NotoSansSCRegular))
      ),
      "img_0.png": Skia.Data.fromBytes(
        new Uint8Array(Array.from(dataAssets.img_0))
      ),
    };
    const source = JSON.stringify(basicSlotsJSON);
    const animation = Skia.Skottie.Make(source, assets);
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    animation.source = source;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    animation.assets = {
      "NotoSerif": Array.from(dataAssets.NotoSansSCRegular),
      "img_0.png": Array.from(dataAssets.img_0),
    };
    // END OF INTERNAL TESTING ONLY
    const img = await surface.draw(
      <Group transform={[{ scale: 0.6 }]}>
        <Skottie animation={animation} frame={0} />
      </Group>
    );
    await checkImage(img, docPath("skottie/skottie-component-basic-slots.png"));
  });
  it("Get durations", async () => {
    const { lego, drinks, confetti, onboarding } = await surface.eval(
      (Skia, ctx) => {
        const legoAnimation = Skia.Skottie.Make(ctx.legoLoader);
        const drinksAnimation = Skia.Skottie.Make(ctx.drinks);
        const confettiAnimation = Skia.Skottie.Make(ctx.confetti);
        const onboardingAnimation = Skia.Skottie.Make(ctx.onboarding);
        return {
          lego: {
            duration: Math.round(legoAnimation.duration() * 1000),
            fps: Math.round(legoAnimation.fps()),
            version: legoAnimation.version(),
            size: legoAnimation.size(),
          },
          drinks: {
            duration: Math.round(drinksAnimation.duration() * 1000),
            fps: Math.round(drinksAnimation.fps()),
            version: drinksAnimation.version(),
            size: drinksAnimation.size(),
          },
          confetti: {
            duration: Math.round(confettiAnimation.duration() * 1000),
            fps: Math.round(confettiAnimation.fps()),
            version: confettiAnimation.version(),
            size: confettiAnimation.size(),
          },
          onboarding: {
            duration: Math.round(onboardingAnimation.duration() * 1000),
            fps: Math.round(onboardingAnimation.fps()),
            version: onboardingAnimation.version(),
            size: onboardingAnimation.size(),
          },
        };
      },
      {
        legoLoader: JSON.stringify(legoLoaderJSON),
        drinks: JSON.stringify(drinksJSON),
        confetti: JSON.stringify(confettiJSON),
        onboarding: JSON.stringify(onboardingJSON),
      }
    );
    expect(lego.version).toEqual("4.7.0");
    expect(lego.duration).toEqual(5033);
    expect(lego.fps).toEqual(30);
    expect(lego.size).toEqual({ width: 800, height: 600 });
    expect(drinks.duration).toEqual(9160);
    expect(drinks.fps).toEqual(25);
    expect(drinks.version).toEqual("4.5.9");
    expect(lego.size).toEqual({ width: 800, height: 600 });
    expect(confetti.duration).toEqual(1969);
    expect(confetti.fps).toEqual(30);
    expect(confetti.version).toEqual("4.12.0");
    expect(lego.size).toEqual({ width: 800, height: 600 });
    expect(onboarding.duration).toEqual(2636);
    expect(onboarding.fps).toEqual(30);
    expect(onboarding.version).toEqual("5.0.3");
    expect(lego.size).toEqual({ width: 800, height: 600 });
  });
  it("Get first frame", async () => {
    const raw = await surface.eval(
      (Skia, ctx) => {
        const legoAnimation = Skia.Skottie.Make(ctx.legoLoader);
        const sur = Skia.Surface.MakeOffscreen(800, 600);
        if (!sur) {
          throw new Error("Failed to create surface");
        }
        const canvas = sur.getCanvas();
        legoAnimation.seekFrame(41);
        legoAnimation.render(canvas);
        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      {
        legoLoader: JSON.stringify(legoLoaderJSON),
      }
    );
    const { Skia } = importSkia();
    const rData = Skia.Data.fromBase64(raw);
    const image = Skia.Image.MakeFromEncoded(rData)!;
    expect(rData).toBeDefined();
    await checkImage(image, docPath("skottie/lego.png"));
  });
  it("Get slot information", async () => {
    const slots = await surface.eval(
      (Skia, ctx) => {
        const assets = {
          "NotoSerif": Skia.Data.fromBytes(new Uint8Array(ctx.NotoSerif)),
          "img_0.png": Skia.Data.fromBytes(new Uint8Array(ctx.img_0)),
        };
        const animation = Skia.Skottie.Make(ctx.basicSlotsJSON, assets);
        return animation.getSlotInfo();
      },
      {
        basicSlotsJSON: JSON.stringify(basicSlotsJSON),
        NotoSerif: Array.from(dataAssets.NotoSansSCRegular),
        img_0: Array.from(dataAssets.img_0),
      }
    );
    expect(slots).toEqual({
      colorSlotIDs: ["FillsGroup", "StrokeGroup"],
      imageSlotIDs: ["ImageSource"],
      scalarSlotIDs: ["Opacity"],
      textSlotIDs: ["TextSource"],
      vec2SlotIDs: ["ScaleGroup"],
    });
  });
  it("Get props information", async () => {
    const props = await surface.eval(
      (Skia, ctx) => {
        const assets = {
          "NotoSerif": Skia.Data.fromBytes(new Uint8Array(ctx.NotoSerif)),
          "img_0.png": Skia.Data.fromBytes(new Uint8Array(ctx.img_0)),
        };
        const animation = Skia.Skottie.Make(ctx.basicSlotsJSON, assets);
        return {
          opacityProps: animation
            .getOpacityProps()
            .sort((a, b) => a.key.localeCompare(b.key)),
          transformProps: [
            animation
              .getTransformProps()
              .find(({ key }) => key === "Transform"),
          ],
          colorProps: animation
            .getColorProps()
            .sort((a, b) => a.key.localeCompare(b.key))
            .map(({ key, value }) => ({ key, value: Array.from(value) })),
          textProps: animation
            .getTextProps()
            .sort((a, b) => a.key.localeCompare(b.key)),
        };
      },
      {
        basicSlotsJSON: JSON.stringify(basicSlotsJSON),
        NotoSerif: Array.from(dataAssets.NotoSansSCRegular),
        img_0: Array.from(dataAssets.img_0),
      }
    );
    expect(props).toEqual({
      opacityProps: [
        { key: "Black Solid 1", value: 70 },
        { key: "Turquoise Solid 1", value: 100 },
        { key: "text_comp", value: 100 },
        { key: "image_comp", value: 100 },
        { key: "shapes_comp", value: 100 },
        { key: "comp", value: 100 },
        { key: "img1.png", value: 100 },
        { key: "text slots", value: 100 },
        { key: "Shape Layer 2", value: 100 },
        { key: "Shape Layer 1", value: 100 },
        { key: "Transform", value: 100 },
      ].sort((a, b) => a.key.localeCompare(b.key)),
      transformProps: [
        {
          key: "Transform",
          value: {
            anchor: { x: 0, y: 0 },
            position: { x: 97, y: 0 },
            scale: { x: 100, y: 100 },
            rotation: 0,
            skew: 0,
            skewAxis: 0,
          },
        },
      ],
      colorProps: [
        { key: "Black Solid 1", value: [0, 0, 0, 1] },
        { key: "Turquoise Solid 1", value: [0, 1, 0.7450980544090271, 1] },
        { key: "Fill 1", value: [0, 0, 0, 1] },
        { key: "Stroke 1", value: [0, 0, 0, 1] },
      ].sort((a, b) => a.key.localeCompare(b.key)),
      textProps: [
        {
          key: "text slots",
          value: {
            size: 39,
            text: "text slots",
          },
        },
      ],
    });
  });
  it("load skottie with assets", async () => {
    const raw = await surface.eval(
      (Skia, ctx) => {
        const assets = {
          "NotoSerif": Skia.Data.fromBytes(new Uint8Array(ctx.NotoSerif)),
          "img_0.png": Skia.Data.fromBytes(new Uint8Array(ctx.img_0)),
        };
        const animation = Skia.Skottie.Make(ctx.basicSlotsJSON, assets);
        const size = animation.size();
        const sur = Skia.Surface.MakeOffscreen(size.width, size.height);
        if (!sur) {
          throw new Error("Failed to create surface");
        }
        const canvas = sur.getCanvas();
        animation.seekFrame(0);
        animation.render(canvas);
        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      {
        basicSlotsJSON: JSON.stringify(basicSlotsJSON),
        NotoSerif: Array.from(dataAssets.NotoSansSCRegular),
        img_0: Array.from(dataAssets.img_0),
      }
    );
    const { Skia } = importSkia();
    const rData = Skia.Data.fromBase64(raw);
    const image = Skia.Image.MakeFromEncoded(rData)!;
    expect(rData).toBeDefined();
    await checkImage(image, docPath("skottie/basic_slots.png"));
  });
  it("load skottie with assets and set color slots", async () => {
    const raw = await surface.eval(
      (Skia, ctx) => {
        const assets = {
          "NotoSerif": Skia.Data.fromBytes(new Uint8Array(ctx.NotoSerif)),
          "img_0.png": Skia.Data.fromBytes(new Uint8Array(ctx.img_0)),
        };
        const animation = Skia.Skottie.Make(ctx.basicSlotsJSON, assets);
        const size = animation.size();
        const sur = Skia.Surface.MakeOffscreen(size.width, size.height);
        if (!sur) {
          throw new Error("Failed to create surface");
        }
        const canvas = sur.getCanvas();
        animation.setColorSlot("FillsGroup", Skia.Color("cyan"));
        animation.setColorSlot("StrokeGroup", Skia.Color("magenta"));
        animation.seekFrame(0);
        animation.render(canvas);
        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      {
        basicSlotsJSON: JSON.stringify(basicSlotsJSON),
        NotoSerif: Array.from(dataAssets.NotoSansSCRegular),
        img_0: Array.from(dataAssets.img_0),
      }
    );
    const { Skia } = importSkia();
    const rData = Skia.Data.fromBase64(raw);
    const image = Skia.Image.MakeFromEncoded(rData)!;
    expect(rData).toBeDefined();
    await checkImage(image, docPath("skottie/basic_slots-with-colors.png"));
  });
  it("has color props", async () => {
    const colorProps = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.fingerprint);
        const props = animation.getColorProps();
        return props.map(({ key, value }) => ({
          key,
          value: Array.from(value),
        }));
      },
      {
        fingerprint: JSON.stringify(fingerprintJSON),
      }
    );
    expect(colorProps.length).toBe(1);
  });
  it("fingerprint example (1)", async () => {
    const raw = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.fingerprint);
        const size = animation.size();
        const sur = Skia.Surface.MakeOffscreen(size.width, size.height);
        if (!sur) {
          throw new Error("Failed to create surface");
        }
        const canvas = sur.getCanvas();
        const colorProp = animation.getColorProps()[0];
        animation.setColor(colorProp.key, Skia.Color("rgb(60, 120, 255)"));
        animation.seekFrame(120);
        animation.render(canvas);
        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      {
        fingerprint: JSON.stringify(fingerprintJSON),
      }
    );
    const { Skia } = importSkia();
    const rData = Skia.Data.fromBase64(raw);
    const image = Skia.Image.MakeFromEncoded(rData)!;
    expect(rData).toBeDefined();
    await checkImage(image, docPath("skottie/fingerprint-color1.png"));
  });
  it("has text props", async () => {
    const colorProps = await surface.eval(
      (Skia, ctx) => {
        const assets = {
          "Avenir-Heavy": Skia.Data.fromBytes(new Uint8Array(ctx.AvenirHeavy)),
        };
        const animation = Skia.Skottie.Make(ctx.textLayerJSON, assets);
        const props = animation.getTextProps();
        return props.map(({ key, value }) => ({
          key,
          value,
        }));
      },
      {
        textLayerJSON: JSON.stringify(textLayerJSON),
        AvenirHeavy: Array.from(dataAssets.AvenirHeavy),
      }
    );
    expect(colorProps[0]).toEqual({
      key: "hello!",
      value: { text: "hello!", size: 164 },
    });
    expect(colorProps[1]).toEqual({
      key: "hello! 2",
      value: { text: "hello!", size: 164 },
    });
  });
  it("text prop", async () => {
    const raw = await surface.eval(
      (Skia, ctx) => {
        const assets = {
          "Avenir-Heavy": Skia.Data.fromBytes(new Uint8Array(ctx.AvenirHeavy)),
        };
        const animation = Skia.Skottie.Make(ctx.textLayer, assets);
        const size = animation.size();
        const sur = Skia.Surface.MakeOffscreen(size.width, size.height);
        if (!sur) {
          throw new Error("Failed to create surface");
        }
        const canvas = sur.getCanvas();
        animation.setText("hello!", "World", 164);
        animation.setText("hello! 2", "World", 164);
        animation.seekFrame(animation.duration() * 0.5);
        animation.render(canvas);
        sur.flush();
        return sur.makeImageSnapshot().encodeToBase64();
      },
      {
        textLayer: JSON.stringify(textLayerJSON),
        AvenirHeavy: Array.from(dataAssets.AvenirHeavy),
      }
    );
    const { Skia } = importSkia();
    const rData = Skia.Data.fromBase64(raw);
    const image = Skia.Image.MakeFromEncoded(rData)!;
    expect(rData).toBeDefined();
    if (surface.OS === "node" || surface.OS === "web") {
      await checkImage(image, docPath("skottie/text-prop-web.png"));
    } else {
      await checkImage(image, docPath("skottie/text-prop.png"));
    }
  });
  it("loads layers and shapes without a name (nm)", async () => {
    // Lottie exporters such as Jitter omit "nm" everywhere; the property
    // observer used to receive a null node name and crash on native.
    const result = await surface.eval(
      (Skia, ctx) => {
        const animation = Skia.Skottie.Make(ctx.unnamedLayers);
        const sur = Skia.Surface.MakeOffscreen(100, 100);
        if (!sur) {
          throw new Error("Failed to create surface");
        }
        animation.seekFrame(0);
        animation.render(sur.getCanvas());
        sur.flush();
        return {
          size: animation.size(),
          fps: Math.round(animation.fps()),
          colorProps: animation.getColorProps().length,
          image: sur.makeImageSnapshot().encodeToBase64(),
        };
      },
      {
        unnamedLayers: JSON.stringify(unnamedLayersJSON),
      }
    );
    expect(result.size).toEqual({ width: 100, height: 100 });
    expect(result.fps).toEqual(30);
    expect(result.colorProps).toEqual(0);
    expect(result.image).toBeDefined();
  });
});
