import React, { useEffect, useState } from "react";
import {
  Image,
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { SkSurface } from "react-native-skia";
import {
  Canvas,
  Fill,
  Group,
  PaintStyle,
  Path,
  RoundedRect,
  Skia,
} from "react-native-skia";

// Diagnostics for https://github.com/wcandillon/react-native-skia/issues/4371
// (PowerVR, Pixel 10 and 11: canvases that draw a stroked path present
// nothing since 3.4.2). Every case draws a red fill and a blue shape, so one
// screenshot tells which render path loses what. The file needs only
// react-native and react-native-skia, so it can be copied into any app.
//
// Graphite draws fills, rects, rounded rects and circles with single-sampled
// analytic renderers. Any other path, a stroked polyline included, takes its
// MSAA renderer: the whole pass then renders into a 4x MSAA attachment and
// resolves into the target. Onscreen the target is the swapchain image; in a
// layer or an offscreen surface it is an ordinary texture, and a snapshot of
// an offscreen surface can be read back and counted.

const W = 300;
const H = 80;
// The pixel size of an onscreen box, so an offscreen surface can get an MSAA
// attachment of the same size as case A.
const PW = Math.round(W * PixelRatio.get());
const PH = Math.round(H * PixelRatio.get());
const RED = "#f4212e";
const BLUE = "#1d9bf0";
const LINE = "M 10 60 L 70 20 L 130 50 L 190 15 L 250 45 L 290 25";
const BARS = [
  { x: 20, y: 30, width: 30, height: 40 },
  { x: 80, y: 10, width: 30, height: 60 },
  { x: 140, y: 40, width: 30, height: 30 },
];

interface Counts {
  red: number;
  blue: number;
  total: number;
}

interface OffscreenResult {
  counts?: Counts;
  uri?: string;
  error?: string;
}

const classify = (pixels: ArrayLike<number>): Counts => {
  let red = 0;
  let blue = 0;
  const total = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r > 180 && g < 90 && b < 110) {
      red++;
    } else if (b > 150 && r < 120) {
      blue++;
    }
  }
  return { red, blue, total };
};

// The blue line covers about 1300 of the 24000 pixels, the bars 3900.
const verdict = (result: OffscreenResult | undefined) => {
  if (!result) {
    return "pending";
  }
  if (result.error) {
    return `ERROR: ${result.error}`;
  }
  const c = result.counts;
  if (!c) {
    return "ERROR: readPixels returned null";
  }
  const detail = `(red ${c.red}, blue ${c.blue} of ${c.total})`;
  const redOk = c.red > c.total * 0.5;
  const blueOk = c.blue > 200;
  if (redOk && blueOk) {
    return `PASS ${detail}`;
  }
  if (redOk) {
    return `RED ONLY, blue shape lost ${detail}`;
  }
  if (c.red + c.blue < 10) {
    return `BLANK, whole pass lost ${detail}`;
  }
  return `UNEXPECTED ${detail}`;
};

const strokePaint = () => {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(BLUE));
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(4);
  paint.setAntiAlias(true);
  return paint;
};

const drawStroke = (surface: SkSurface) => {
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(RED));
  const path = Skia.Path.MakeFromSVGString(LINE);
  if (path) {
    canvas.drawPath(path, strokePaint());
  }
  surface.flush();
};

const drawBars = (surface: SkSurface) => {
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(RED));
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(BLUE));
  paint.setAntiAlias(true);
  BARS.forEach(({ x, y, width, height }) => {
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(x, y, width, height), 4, 4),
      paint
    );
  });
  surface.flush();
};

// Like case D, offscreen: the stroke goes through a layer, so the recording
// holds two render passes, the layer's MSAA pass and the single-sampled main
// pass that composites it over the red fill.
const drawStrokeInLayer = (surface: SkSurface) => {
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(RED));
  canvas.saveLayer();
  const path = Skia.Path.MakeFromSVGString(LINE);
  if (path) {
    canvas.drawPath(path, strokePaint());
  }
  canvas.restore();
  surface.flush();
};

// Scales the drawing so the same shapes fill a surface of a different size.
const scaled =
  (draw: (surface: SkSurface) => void, scale: number) =>
  (surface: SkSurface) => {
    surface.getCanvas().scale(scale, scale);
    draw(surface);
  };

const readBack = async (surface: SkSurface): Promise<OffscreenResult> => {
  const image = surface.makeImageSnapshot();
  const info = image.getImageInfo();
  const pixels = await image.readPixels(0, 0, {
    width: info.width,
    height: info.height,
    colorType: info.colorType,
    alphaType: info.alphaType,
  });
  const base64 = await image.encodeToBase64();
  return {
    counts: pixels ? classify(pixels) : undefined,
    uri: `data:image/png;base64,${base64}`,
  };
};

const OFFSCREEN_CASES = [
  {
    id: "E",
    title: "E. Offscreen GPU surface: red fill + stroked path",
    expect:
      "MSAA attachment resolved into a texture, not the swapchain. PASS here with A blank means the bug is specific to resolving into the window.",
    make: () => Skia.Surface.MakeOffscreen(W, H),
    draw: drawStroke,
  },
  {
    id: "F",
    title: "F. Offscreen GPU surface: red fill + bars (control)",
    expect: "Single-sampled pass into a texture, expected PASS everywhere.",
    make: () => Skia.Surface.MakeOffscreen(W, H),
    draw: drawBars,
  },
  {
    id: "G",
    title: "G. CPU raster surface: red fill + stroked path (control)",
    expect: "No GPU involved, expected PASS everywhere.",
    make: () => Skia.Surface.MakeRaster(W, H),
    draw: drawStroke,
  },
  {
    id: "H",
    title: `H. Offscreen GPU surface at the onscreen pixel size (${PW}x${PH}): red fill + stroked path`,
    expect:
      "Same drawing as E with an MSAA attachment of the same size as case A. BLANK here with E PASS means the size matters.",
    make: () => Skia.Surface.MakeOffscreen(PW, PH),
    draw: scaled(drawStroke, PixelRatio.get()),
  },
  {
    id: "I",
    title: "I. Offscreen GPU surface: red fill + stroked path inside a layer",
    expect:
      "Two passes in one recording like case D (layer MSAA pass, then the main pass), but no swapchain and no render thread. BLANK here means the extra pass is enough to lose the recording.",
    make: () => Skia.Surface.MakeOffscreen(W, H),
    draw: drawStrokeInLayer,
  },
  {
    id: "J",
    title: `J. Offscreen GPU surface at the onscreen pixel size (${PW}x${PH}): stroked path inside a layer`,
    expect: "I at the size of case D.",
    make: () => Skia.Surface.MakeOffscreen(PW, PH),
    draw: scaled(drawStrokeInLayer, PixelRatio.get()),
  },
];

const deviceLine = () => {
  const constants = Platform.constants as unknown as {
    Brand?: string;
    Model?: string;
    Release?: string;
  };
  if (Platform.OS === "android") {
    return `${constants.Brand ?? ""} ${constants.Model ?? ""}, Android ${
      constants.Release ?? "?"
    }`;
  }
  return `${Platform.OS} ${Platform.Version}`;
};

export const Issue4371 = () => {
  const [results, setResults] = useState<Record<string, OffscreenResult>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const collected: Record<string, OffscreenResult> = {};
      for (const testCase of OFFSCREEN_CASES) {
        try {
          const surface = testCase.make();
          if (!surface) {
            collected[testCase.id] = { error: "surface creation failed" };
          } else {
            testCase.draw(surface);
            collected[testCase.id] = await readBack(surface);
          }
        } catch (e) {
          collected[testCase.id] = { error: String(e) };
        }
        if (!cancelled) {
          setResults({ ...collected });
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Issue 4371 diagnostics</Text>
      <Text style={styles.body}>
        {deviceLine()}, pixel ratio {PixelRatio.get()}, onscreen box {PW}x{PH}
        px
      </Text>
      <Text style={styles.body}>
        Every box below should show a red background with a blue shape. Take a
        screenshot of the whole screen (scroll for the rest) and post it on the
        issue together with the logcat lines tagged RNSkia.
      </Text>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Offscreen read-back</Text>
        {OFFSCREEN_CASES.map((testCase) => (
          <Text key={testCase.id} style={styles.mono}>
            {testCase.id}: {verdict(results[testCase.id])}
          </Text>
        ))}
      </View>

      <Case
        title="A. Onscreen: red fill + stroked path"
        expect="The failing case on PowerVR. White: the whole MSAA pass is lost. Red without the line: only the MSAA draw is lost."
      >
        <Canvas style={styles.canvas}>
          <Fill color={RED} />
          <Path
            path={LINE}
            style="stroke"
            strokeWidth={4}
            strokeCap="round"
            strokeJoin="round"
            color={BLUE}
          />
        </Canvas>
      </Case>

      <Case
        title="B. Onscreen: red fill + bars (control)"
        expect="Analytic rounded rects, single-sampled pass. Shows the canvas is alive."
      >
        <Canvas style={styles.canvas}>
          <Fill color={RED} />
          {BARS.map((bar, i) => (
            <RoundedRect key={i} {...bar} r={4} color={BLUE} />
          ))}
        </Canvas>
      </Case>

      <Case
        title="C. Onscreen: red fill + stroked rounded rect"
        expect="A stroke that Graphite still draws analytically. Visible here with A blank confirms only MSAA passes fail."
      >
        <Canvas style={styles.canvas}>
          <Fill color={RED} />
          <RoundedRect
            x={20}
            y={15}
            width={260}
            height={50}
            r={10}
            style="stroke"
            strokeWidth={4}
            color={BLUE}
          />
        </Canvas>
      </Case>

      <Case
        title="D. Onscreen: red fill + stroked path inside a layer"
        expect="The line renders through an MSAA pass into a layer texture, which is then composited single-sampled onto the window."
      >
        <Canvas style={styles.canvas}>
          <Fill color={RED} />
          <Group layer>
            <Path
              path={LINE}
              style="stroke"
              strokeWidth={4}
              strokeCap="round"
              strokeJoin="round"
              color={BLUE}
            />
          </Group>
        </Canvas>
      </Case>

      <Case
        title="K. Onscreen: red fill + bars inside a layer (control)"
        expect="A layer whose pass has no MSAA draw. Visible here with D blank means the layer mechanism is fine and D fails because of its MSAA pass."
      >
        <Canvas style={styles.canvas}>
          <Fill color={RED} />
          <Group layer>
            {BARS.map((bar, i) => (
              <RoundedRect key={i} {...bar} r={4} color={BLUE} />
            ))}
          </Group>
        </Canvas>
      </Case>

      <Case
        title="L. Onscreen SurfaceView: red fill + stroked path"
        expect="Case A on a SurfaceView instead of the default TextureView: a different window producer behind the same Vulkan swapchain."
      >
        <Canvas style={styles.canvas} android={{ backingView: "SurfaceView" }}>
          <Fill color={RED} />
          <Path
            path={LINE}
            style="stroke"
            strokeWidth={4}
            strokeCap="round"
            strokeJoin="round"
            color={BLUE}
          />
        </Canvas>
      </Case>

      <Case
        title="M. Onscreen SurfaceView: red fill + stroked path inside a layer"
        expect="Case D on a SurfaceView."
      >
        <Canvas style={styles.canvas} android={{ backingView: "SurfaceView" }}>
          <Fill color={RED} />
          <Group layer>
            <Path
              path={LINE}
              style="stroke"
              strokeWidth={4}
              strokeCap="round"
              strokeJoin="round"
              color={BLUE}
            />
          </Group>
        </Canvas>
      </Case>

      {OFFSCREEN_CASES.map((testCase) => (
        <Case key={testCase.id} title={testCase.title} expect={testCase.expect}>
          <Text style={styles.mono}>{verdict(results[testCase.id])}</Text>
          {results[testCase.id]?.uri ? (
            <Image
              source={{ uri: results[testCase.id].uri }}
              style={styles.canvas}
              resizeMode="stretch"
            />
          ) : (
            <View style={styles.canvas} />
          )}
        </Case>
      ))}
    </ScrollView>
  );
};

interface CaseProps {
  title: string;
  expect: string;
  children: React.ReactNode;
}

const Case = ({ title, expect, children }: CaseProps) => (
  <View style={styles.case}>
    <Text style={styles.caseTitle}>{title}</Text>
    <Text style={styles.expect}>{expect}</Text>
    <View style={styles.frame}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: "600", color: "#111", marginBottom: 4 },
  body: { fontSize: 13, color: "#333", marginBottom: 8 },
  summary: {
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 14, fontWeight: "600", color: "#111" },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "#111",
    marginTop: 4,
  },
  case: { marginBottom: 16 },
  caseTitle: { fontSize: 14, fontWeight: "600", color: "#111" },
  expect: { fontSize: 12, color: "#555", marginBottom: 6 },
  frame: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#999",
  },
  canvas: { width: W, height: H },
});
