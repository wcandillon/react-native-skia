import { Skia, useFont } from "@shopify/react-native-skia";
import React, { useCallback } from "react";
import { View, Button, Alert } from "react-native";
import { opacity } from "react-native-reanimated/lib/typescript/Colors";

enum CommandType {
  SavePaint,
  DrawText,
  RestorePaint,
}

function randomColor() {
  // Generate random values for red, green, and blue (0-255)
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // Return the color as an rgba string
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

const total = 2500;

const recording = new Array(total).fill(0).flatMap((_, i) => {
  return [
    {
      type: CommandType.SavePaint,
      props: { color: randomColor(), opacity: Math.random() },
    },
    {
      type: CommandType.DrawText,
      props: { text: `Hello ${i}`, x: Math.random(), y: Math.random() },
    },
    { type: CommandType.RestorePaint },
  ];
});

class Paint {
  private _color = "black";
  private _opacity = 1;

  set color(color: string) {
    this._color = color;
  }

  set opacity(opacity: number) {
    this._opacity = opacity;
  }
}

class Canvas {
  private commands: any[] = [];
  drawText(text: string, paint: Paint) {
    this.commands.push({
      type: CommandType.DrawText,
      text,
      paint: { color: paint.color, opacity: paint.opacity },
    });
  }
}

const BLACK = Float32Array.of(0, 0, 0, 1);

export const PerformanceDrawingTest = () => {
  const font = useFont(require("../../assets/SF-Mono-Semibold.otf"), 32);
  const runJSBenchmark = useCallback(() => {
    const start = performance.now();
    const paint = new Paint();
    const canvas = new Canvas();
    recording.forEach((command) => {
      if (command.type === CommandType.SavePaint) {
        paint.color = command.props.color;
        paint.opacity = command.props.opacity;
      } else if (command.type === CommandType.DrawText) {
        canvas.drawText(command.props.text, paint);
      } else if (command.type === CommandType.RestorePaint) {
        paint.color = "black";
        paint.opacity = 1;
      }
    });
    const end = performance.now();
    Alert.alert("Pure JS benchmark", `Time: ${end - start} ms`);
  }, []);
  const runJSIBenchmark = useCallback(() => {
    const start = performance.now();
    const paint = Skia.Paint();
    const surface = Skia.Surface.MakeOffscreen(1024, 1024)!;
    const canvas = surface.getCanvas();
    recording.forEach((command) => {
      if (command.type === CommandType.SavePaint) {
        paint.setColor(Skia.Color(command.props.color));
        paint.setAlphaf(command.props.opacity);
      } else if (command.type === CommandType.DrawText) {
        canvas.drawText(command.props.text, 0, 0, paint, font);
      } else if (command.type === CommandType.RestorePaint) {
        paint.setColor(BLACK);
        paint.setAlphaf(1);
      }
    });
    const end = performance.now();
    Alert.alert("Pure JS benchmark", `Time: ${end - start} ms`);
  }, [font]);
  return (
    <View style={{ flex: 1 }}>
      <Button title="Run JS benchmark" onPress={runJSBenchmark} />
      <Button title="Run JSI benchmark" onPress={runJSIBenchmark} />
    </View>
  );
};
