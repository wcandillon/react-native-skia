import { fitbox } from "../../renderer";
import {
  importSkia,
  width,
  height,
  loadImage,
  PIXEL_RATIO,
  getSkDOM,
} from "../../renderer/__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
import { docPath, processResult } from "../../__tests__/setup";

const size = width;
const padding = 48;
const r = 24;

describe("Group", () => {
  it("should clip rect", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, rect } = importSkia();
    const Sk = getSkDOM();
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    const clipRect = rect(
      padding,
      padding,
      size - padding * 2,
      size - padding * 2
    );
    // Root
    const root = Sk.Group({
      color: Skia.Color("lightblue"),
    });
    root.addChild(Sk.Fill());
    const clipNode = Sk.Group({ clip: clipRect });
    clipNode.addChild(
      Sk.Image({ image, fit: "cover", x: 0, y: 0, width: size, height: size })
    );
    root.addChild(clipNode);
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("group/clip-rect.png"));
  });
  it("should clip rounded rect", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, rect, rrect } = importSkia();
    const Sk = getSkDOM();
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    const clipRRect = rrect(
      rect(padding, padding, size - padding * 2, size - padding * 2),
      r,
      r
    );
    const root = Sk.Group({ clip: clipRRect });
    root.addChild(
      Sk.Image({ image, fit: "cover", x: 0, y: 0, width: size, height: size })
    );
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("group/clip-rrect.png"));
  });
  it("Should use a path as a clip", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, processTransform2d } = importSkia();
    const Sk = getSkDOM();
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    const clipPath = Skia.Path.MakeFromSVGString(
      "M 128 0 L 168 80 L 256 93 L 192 155 L 207 244 L 128 202 L 49 244 L 64 155 L 0 93 L 88 80 L 128 0 Z"
    )!;
    expect(clipPath).toBeTruthy();
    clipPath.transform(processTransform2d([{ scale: 3 }]));

    const root = Sk.Group({ clip: clipPath });

    root.addChild(
      Sk.Image({ image, fit: "cover", x: 0, y: 0, width: size, height: size })
    );

    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("group/clip-path.png"));
  });
  it("Should invert a clip", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, processTransform2d } = importSkia();
    const Sk = getSkDOM();
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    const clipPath = Skia.Path.MakeFromSVGString(
      "M 128 0 L 168 80 L 256 93 L 192 155 L 207 244 L 128 202 L 49 244 L 64 155 L 0 93 L 88 80 L 128 0 Z"
    )!;
    expect(clipPath).toBeTruthy();
    clipPath.transform(processTransform2d([{ scale: 3 }]));

    const root = Sk.Group({ clip: clipPath, invertClip: true });
    root.addChild(
      Sk.Image({ image, fit: "cover", x: 0, y: 0, width: size, height: size })
    );
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("group/invert-clip.png"));
  });
  it("Drawing elements inherits group properties", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, rect } = importSkia();
    const Sk = getSkDOM();

    const svgPath =
      // eslint-disable-next-line max-len
      "M481.586 193.457C470.446 176.319 382.871 101.323 313.771 101.323C244.671 101.323 207.195 126.054 193.668 142.763C149.967 196.747 134.971 249.875 148.681 302.146C166.676 365.556 216.376 423.397 297.781 475.668C391.183 528.795 451.166 589.207 477.73 656.902C487.156 686.893 488.441 716.456 481.586 745.591C474.731 774.725 461.021 801.289 440.455 825.282C423.317 848.419 400.609 865.128 372.332 875.411C344.054 884.837 309.778 892.12 269.504 897.262C172.674 904.974 93.8398 890.407 33 853.56M559.992 689.035C667.105 531.366 746.796 399.832 799.067 294.434C811.92 264.442 821.346 241.735 827.344 226.31C833.343 210.029 839.341 188.607 845.339 162.043C851.338 135.479 853.48 111.058 851.766 88.7783C849.195 66.4989 838.056 51.0748 818.347 39.9351C798.638 28.7954 784.212 31.7989 761.792 43.7911C724.945 63.4998 700.095 97.3473 687.242 145.334C679.53 165.899 671.817 189.892 664.105 217.313C657.25 244.734 652.109 265.728 648.681 280.295C646.111 294.862 641.398 321.426 634.542 359.987C627.687 397.69 623.403 419.969 621.689 426.825C604.551 533.937 583.985 689.464 559.992 893.406C586.556 800.861 616.976 727.167 651.252 672.326C663.248 648.333 673.531 629.481 682.1 615.771C690.669 602.06 703.094 587.065 719.375 570.784C736.513 554.502 754.508 542.506 773.36 534.794C837.627 510.801 883.9 512.943 912.177 541.221C929.315 559.215 937.884 581.066 937.884 606.773C938.741 632.48 928.887 652.617 908.321 667.185C868.047 689.464 806.779 696.748 724.517 689.035C738.227 693.32 748.51 697.176 755.365 700.604C763.077 703.174 772.503 707.459 783.643 713.457C795.639 719.455 804.637 726.739 810.635 735.308C817.49 743.877 821.775 753.731 823.488 764.871C824.345 769.155 825.631 777.296 827.344 789.293C829.915 801.289 832.057 810.287 833.771 816.285C835.485 822.283 837.627 829.995 840.198 839.421C843.626 848.847 847.482 856.987 851.766 863.843C856.907 869.841 862.906 875.839 869.761 881.838C891.183 902.403 926.745 899.832 976.445 874.125C991.012 867.27 1004.29 858.701 1016.29 848.418C1029.14 838.136 1041.14 825.711 1052.28 811.143C1064.28 795.719 1073.7 783.294 1080.56 773.868C1087.41 763.586 1096.84 748.59 1108.84 728.881C1120.83 709.173 1129.4 695.891 1134.54 689.035C1161.96 634.194 1189.38 579.352 1216.8 524.511C1174.82 629.909 1147.82 710.458 1135.83 766.156C1130.69 782.437 1128.54 801.289 1129.4 822.712C1130.26 844.134 1136.68 861.272 1148.68 874.125C1157.25 884.408 1167.96 891.263 1180.81 894.691C1194.53 898.119 1207.38 897.69 1219.38 893.406C1271.65 877.981 1314.06 847.99 1346.62 803.431C1365.48 777.724 1390.75 739.592 1422.46 689.035M1275.93 367.699C1263.93 367.699 1256.65 362.129 1254.08 350.989C1252.37 338.993 1253.65 328.71 1257.94 320.141C1261.37 313.272 1272.5 314.999 1283.64 314.999C1294.78 314.999 1303.74 321.228 1304.21 329.138M1804.21 655.616C1782.79 595.634 1756.65 558.358 1725.8 543.791C1696.67 526.653 1664.11 518.513 1628.12 519.37C1592.13 519.37 1559.99 528.796 1531.71 547.647C1505.15 563.071 1482.44 583.637 1463.59 609.344C1444.74 634.194 1431.89 661.615 1425.03 691.606C1419.03 720.741 1419.89 750.304 1427.6 780.295C1436.17 809.43 1450.74 834.28 1471.3 854.845C1503.87 882.266 1543.28 895.976 1589.56 895.976C1635.83 895.976 1675.67 882.266 1709.09 854.845C1722.8 841.135 1732.66 831.281 1738.66 825.282C1744.65 819.284 1751.51 810.715 1759.22 799.575C1767.79 788.436 1774.65 776.868 1779.79 764.871M1835.06 523.226C1811.92 618.341 1796.5 701.032 1788.78 771.298C1781.07 825.282 1791.35 862.557 1819.63 883.123C1841.05 900.261 1874.47 897.69 1919.89 875.411C1959.31 856.559 1997.01 819.712 2033 764.871";
    const path = Skia.Path.MakeFromSVGString(svgPath)!;
    expect(path).toBeTruthy();
    const src = path.computeTightBounds();
    const strokeWidth = 30 * PIXEL_RATIO;
    const dst = rect(0, 0, width, height);
    const transform = fitbox("contain", src, dst);
    const root = Sk.Group({ transform });
    root.addChild(
      Sk.Path({
        path,
        strokeCap: "round",
        strokeJoin: "round",
        style: "stroke",
        strokeWidth,
        start: 0,
        end: 1,
      })
    );
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("group/scale-path.png"));
  });
});
