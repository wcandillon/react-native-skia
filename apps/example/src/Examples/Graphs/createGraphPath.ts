import { Skia } from "react-native-skia";

export const createGraphPath = (
  width: number,
  height: number,
  steps: number,
  round = true
) => {
  const builder = Skia.PathBuilder.Make();
  let y = height / 2;
  builder.moveTo(0, y);
  const prevPt = { x: 0, y };
  for (let i = 0; i < width; i += width / steps) {
    // increase y by a random amount between -10 and 10
    y += Math.random() * 30 - 15;
    y = Math.max(height * 0.2, Math.min(y, height * 0.7));

    if (round && i > 0) {
      const xMid = (prevPt.x + i) / 2;
      const yMid = (prevPt!.y + y) / 2;
      builder.quadTo(prevPt.x, prevPt.y, xMid, yMid);
      prevPt.x = i;
      prevPt.y = y;
    } else {
      builder.lineTo(i, y);
    }
  }
  return builder.build();
};

export const createZeroPath = (
  width: number,
  height: number,
  steps: number
) => {
  const builder = Skia.PathBuilder.Make();
  const y = height / 2;
  builder.moveTo(0, y);
  for (let i = 0; i < width; i += width / steps) {
    builder.lineTo(i, y);
  }
  return builder.build();
};
