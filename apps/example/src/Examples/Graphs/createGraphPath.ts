import { Skia } from "@shopify/react-native-skia";

export const createGraphPath = (
  width: number,
  height: number,
  steps: number,
  round = true
) => {
  const retVal = Skia.Path.Make();
  let y = height / 2;
  retVal.moveTo(0, y);
  const prevPt = { x: 0, y };
  for (let i = 0; i < width; i += width / steps) {
    // increase y by a random amount between -10 and 10
    y += Math.random() * 30 - 15;
    y = Math.max(height * 0.2, Math.min(y, height * 0.7));

    if (round && i > 0) {
      const xMid = (prevPt.x + i) / 2;
      const yMid = (prevPt!.y + y) / 2;
      retVal.quadTo(prevPt.x, prevPt.y, xMid, yMid);
      prevPt.x = i;
      prevPt.y = y;
    } else {
      retVal.lineTo(i, y);
    }
  }
  return retVal;
};

export const createZeroPath = (
  width: number,
  height: number,
  steps: number
) => {
  const retVal = Skia.Path.Make();
  const y = height / 2;
  retVal.moveTo(0, y);
  for (let i = 0; i < width; i += width / steps) {
    retVal.lineTo(i, y);
  }
  return retVal;
};
