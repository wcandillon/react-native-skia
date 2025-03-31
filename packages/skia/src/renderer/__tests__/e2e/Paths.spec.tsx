import React from "react";

import { surface, importSkia } from "../setup";
import { Fill, Group, Path, Rect } from "../../components";
import { checkImage, docPath, itRunsNodeOnly } from "../../../__tests__/setup";
import type { Skia } from "../../../skia/types";
import { PaintStyle } from "../../../skia/types";

const star = (Skia: Skia) => {
  const R = 115.2;
  const C = 128.0;
  const path = Skia.Path.Make();
  path.moveTo(C + R, C);
  for (let i = 1; i < 8; ++i) {
    const a = 2.6927937 * i;
    path.lineTo(C + R * Math.cos(a), C + R * Math.sin(a));
  }
  return path;
};

describe("Paths", () => {
  it("can transform a path from a matrix array (1)", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      path.lineTo(30, 30);
      path.transform([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      const cmds = path.toCmds();
      return cmds;
    });
    expect(result).toEqual([
      [0, 0, 0],
      [1, 30, 30],
    ]);
  });
  it("can transform a path from a matrix array (2)", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      path.lineTo(30, 30);
      path.transform([2, 0, 0, 0, 2, 0, 0, 0, 1]);
      const cmds = path.toCmds();
      return cmds;
    });
    expect(result).toEqual([
      [0, 0, 0],
      [1, 60, 60],
    ]);
  });
  it("generate commands properly", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      path.lineTo(30, 30);
      const cmds = path.toCmds();
      return cmds;
    });
    expect(result).toEqual([
      [0, 0, 0],
      [1, 30, 30],
    ]);
  });
  it("closePath shouldn't crash", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      path.moveTo(0, 0).lineTo(1, 0).lineTo(1, 1);
      path.close();
      const cmds = path.toCmds();
      return cmds;
    });
    const { Skia } = importSkia();
    const ref = Skia.Path.Make();
    ref.moveTo(0, 0).lineTo(1, 0).lineTo(1, 1);
    ref.close();
    expect(result[result.length - 1]).toEqual([5]);
  });
  it("toCmd should work properly", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.MakeFromSVGString(
        // eslint-disable-next-line max-len
        "M512.213 204.005C500.312 185.697 406.758 105.581 332.94 105.581C259.122 105.581 219.088 132 204.638 149.85C157.952 207.52 141.933 264.275 156.579 320.115C175.803 387.854 228.896 449.644 315.859 505.483C415.638 562.238 479.716 626.774 508.093 699.091C518.163 731.13 519.536 762.711 512.213 793.835C504.889 824.959 490.243 853.336 468.273 878.967C449.965 903.683 425.707 921.534 395.499 932.518C365.291 942.588 328.675 950.369 285.651 955.861C182.21 964.1 97.9935 948.538 33 909.176M595.972 733.419C710.397 564.985 795.529 424.47 851.369 311.876C865.1 279.837 875.169 255.579 881.577 239.102C887.985 221.709 894.393 198.824 900.801 170.447C907.208 142.069 909.497 115.98 907.666 92.1797C904.92 68.3793 893.02 51.9021 871.965 40.0019C850.911 28.1016 835.5 31.3101 811.549 44.1212C772.187 65.1754 745.64 101.334 731.909 152.596C723.67 174.566 715.432 200.197 707.193 229.49C699.87 258.783 694.378 281.21 690.716 296.772C687.97 312.334 682.935 340.711 675.612 381.904C668.289 422.182 663.712 445.982 661.881 453.306C643.573 567.731 621.603 733.876 595.972 951.742C624.349 852.878 656.846 774.154 693.462 715.568C706.278 689.937 717.263 669.798 726.417 655.152C735.571 640.505 748.844 624.486 766.237 607.093C784.545 589.701 803.768 576.885 823.907 568.646C892.562 543.015 941.994 545.304 972.202 575.512C990.51 594.735 999.664 618.078 999.664 645.54C1000.58 673.002 990.052 694.514 968.083 710.076C925.059 733.876 859.608 741.657 771.729 733.419C786.375 737.996 797.36 742.115 804.683 745.776C812.922 748.523 822.992 753.1 834.892 759.508C847.707 765.915 857.319 773.696 863.727 782.85C871.05 792.004 875.627 802.531 877.458 814.432C878.373 819.009 879.746 827.705 881.577 840.521C884.323 853.336 886.612 862.948 888.443 869.356C890.273 875.763 892.562 884.002 895.308 894.072C898.97 904.141 903.089 912.837 907.666 920.16C913.159 926.568 919.566 932.976 926.89 939.384C949.775 961.354 987.764 958.607 1040.86 931.145C1056.42 923.822 1070.61 914.668 1083.42 903.683C1097.15 892.698 1109.97 879.425 1121.87 863.863C1134.69 847.386 1144.76 834.113 1152.08 824.043C1159.4 813.058 1169.47 797.039 1182.29 775.985C1195.1 754.931 1204.26 740.742 1209.75 733.419C1239.04 674.833 1268.33 616.247 1297.63 557.661C1252.77 670.256 1223.94 756.304 1211.12 815.805C1205.63 833.197 1203.34 853.336 1204.26 876.221C1205.17 899.106 1212.04 917.414 1224.85 931.145C1234.01 942.13 1245.45 949.453 1259.18 953.115C1273.83 956.777 1287.56 956.319 1300.37 951.742C1356.21 935.265 1401.53 903.226 1436.31 855.625C1456.45 828.163 1483.45 787.427 1517.32 733.419M1360.79 390.143C1347.97 390.143 1340.19 384.193 1337.45 372.293C1335.62 359.477 1336.99 348.492 1341.57 339.338C1345.24 332 1357.13 333.846 1369.03 333.846C1380.93 333.846 1390.5 340.5 1391 348.95M1925.13 697.718C1902.25 633.64 1874.33 593.82 1841.38 578.258C1810.25 559.95 1775.47 551.254 1737.02 552.169C1698.57 552.169 1664.25 562.238 1634.04 582.377C1605.66 598.855 1581.4 620.824 1561.26 648.286C1541.12 674.833 1527.39 704.126 1520.07 736.165C1513.66 767.288 1514.58 798.87 1522.82 830.909C1531.97 862.032 1547.53 888.579 1569.5 910.549C1604.29 939.842 1646.4 954.488 1695.83 954.488C1745.26 954.488 1787.82 939.842 1823.53 910.549C1838.17 895.902 1848.7 885.375 1855.11 878.967C1861.51 872.56 1868.84 863.406 1877.08 851.505C1886.23 839.605 1893.55 827.247 1899.05 814.432M1958.09 556.288C1933.37 657.898 1916.9 746.234 1908.66 821.297C1900.42 878.967 1911.4 918.787 1941.61 940.757C1964.5 959.065 2000.2 956.319 2048.71 932.518C2090.82 912.38 2131.1 873.017 2169.55 814.432"
      );
      if (!path) {
        return [];
      }
      const cmds = path.toCmds();
      return cmds;
    });
    const { Skia } = importSkia();
    const ref = Skia.Path.MakeFromSVGString(
      // eslint-disable-next-line max-len
      "M512.213 204.005C500.312 185.697 406.758 105.581 332.94 105.581C259.122 105.581 219.088 132 204.638 149.85C157.952 207.52 141.933 264.275 156.579 320.115C175.803 387.854 228.896 449.644 315.859 505.483C415.638 562.238 479.716 626.774 508.093 699.091C518.163 731.13 519.536 762.711 512.213 793.835C504.889 824.959 490.243 853.336 468.273 878.967C449.965 903.683 425.707 921.534 395.499 932.518C365.291 942.588 328.675 950.369 285.651 955.861C182.21 964.1 97.9935 948.538 33 909.176M595.972 733.419C710.397 564.985 795.529 424.47 851.369 311.876C865.1 279.837 875.169 255.579 881.577 239.102C887.985 221.709 894.393 198.824 900.801 170.447C907.208 142.069 909.497 115.98 907.666 92.1797C904.92 68.3793 893.02 51.9021 871.965 40.0019C850.911 28.1016 835.5 31.3101 811.549 44.1212C772.187 65.1754 745.64 101.334 731.909 152.596C723.67 174.566 715.432 200.197 707.193 229.49C699.87 258.783 694.378 281.21 690.716 296.772C687.97 312.334 682.935 340.711 675.612 381.904C668.289 422.182 663.712 445.982 661.881 453.306C643.573 567.731 621.603 733.876 595.972 951.742C624.349 852.878 656.846 774.154 693.462 715.568C706.278 689.937 717.263 669.798 726.417 655.152C735.571 640.505 748.844 624.486 766.237 607.093C784.545 589.701 803.768 576.885 823.907 568.646C892.562 543.015 941.994 545.304 972.202 575.512C990.51 594.735 999.664 618.078 999.664 645.54C1000.58 673.002 990.052 694.514 968.083 710.076C925.059 733.876 859.608 741.657 771.729 733.419C786.375 737.996 797.36 742.115 804.683 745.776C812.922 748.523 822.992 753.1 834.892 759.508C847.707 765.915 857.319 773.696 863.727 782.85C871.05 792.004 875.627 802.531 877.458 814.432C878.373 819.009 879.746 827.705 881.577 840.521C884.323 853.336 886.612 862.948 888.443 869.356C890.273 875.763 892.562 884.002 895.308 894.072C898.97 904.141 903.089 912.837 907.666 920.16C913.159 926.568 919.566 932.976 926.89 939.384C949.775 961.354 987.764 958.607 1040.86 931.145C1056.42 923.822 1070.61 914.668 1083.42 903.683C1097.15 892.698 1109.97 879.425 1121.87 863.863C1134.69 847.386 1144.76 834.113 1152.08 824.043C1159.4 813.058 1169.47 797.039 1182.29 775.985C1195.1 754.931 1204.26 740.742 1209.75 733.419C1239.04 674.833 1268.33 616.247 1297.63 557.661C1252.77 670.256 1223.94 756.304 1211.12 815.805C1205.63 833.197 1203.34 853.336 1204.26 876.221C1205.17 899.106 1212.04 917.414 1224.85 931.145C1234.01 942.13 1245.45 949.453 1259.18 953.115C1273.83 956.777 1287.56 956.319 1300.37 951.742C1356.21 935.265 1401.53 903.226 1436.31 855.625C1456.45 828.163 1483.45 787.427 1517.32 733.419M1360.79 390.143C1347.97 390.143 1340.19 384.193 1337.45 372.293C1335.62 359.477 1336.99 348.492 1341.57 339.338C1345.24 332 1357.13 333.846 1369.03 333.846C1380.93 333.846 1390.5 340.5 1391 348.95M1925.13 697.718C1902.25 633.64 1874.33 593.82 1841.38 578.258C1810.25 559.95 1775.47 551.254 1737.02 552.169C1698.57 552.169 1664.25 562.238 1634.04 582.377C1605.66 598.855 1581.4 620.824 1561.26 648.286C1541.12 674.833 1527.39 704.126 1520.07 736.165C1513.66 767.288 1514.58 798.87 1522.82 830.909C1531.97 862.032 1547.53 888.579 1569.5 910.549C1604.29 939.842 1646.4 954.488 1695.83 954.488C1745.26 954.488 1787.82 939.842 1823.53 910.549C1838.17 895.902 1848.7 885.375 1855.11 878.967C1861.51 872.56 1868.84 863.406 1877.08 851.505C1886.23 839.605 1893.55 827.247 1899.05 814.432M1958.09 556.288C1933.37 657.898 1916.9 746.234 1908.66 821.297C1900.42 878.967 1911.4 918.787 1941.61 940.757C1964.5 959.065 2000.2 956.319 2048.71 932.518C2090.82 912.38 2131.1 873.017 2169.55 814.432"
    )!;
    expect(result).toEqual(ref.toCmds());
  });
  it("should accept [0, 1] as trim value", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      path.moveTo(20, 20);
      path.lineTo(20, 40);
      path.lineTo(40, 20);
      path.trim(0, 1, false);
      return path.toSVGString();
    });
    expect(result).toEqual("M20 20L20 40L40 20");
  });
  itRunsNodeOnly("should accept [0.0001, 1.00001] as trim value", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      path.moveTo(20, 20);
      path.lineTo(20, 40);
      path.lineTo(40, 20);
      path.trim(0.0001, 1.00001, false);
      return path.toSVGString();
    });
    expect(result).toBeApproximatelyEqual("M20 20.0048L20 40L40 20");
  });
  it("should accept [0, 1.2] as trim value", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      path.moveTo(20, 20);
      path.lineTo(20, 40);
      path.lineTo(40, 20);
      path.trim(0, 1.2, false);
      return path.toSVGString();
    });
    expect(result).toEqual("M20 20L20 40L40 20");
  });
  itRunsNodeOnly("interpolation values can overshoot", async () => {
    const result = await surface.eval((Skia) => {
      const path2 = Skia.Path.Make();
      path2.moveTo(0, 0);
      path2.lineTo(20, 20);
      path2.lineTo(20, 40);
      const path = Skia.Path.Make();
      path.moveTo(20, 20);
      path.lineTo(20, 40);
      path.lineTo(40, 20);
      path.trim(0, 1, false);
      return [
        path.interpolate(path2, -1)!.toSVGString(),
        path.interpolate(path2, 0)!.toSVGString(),
        path.interpolate(path2, 0.0001)!.toSVGString(),
        path.interpolate(path2, 1)!.toSVGString(),
        path.interpolate(path2, 1.0001)!.toSVGString(),
        path.interpolate(path2, 1.2)!.toSVGString(),
        path.interpolate(path2, 2)!.toSVGString(),
      ].join(" ");
    });
    expect(result).toBeApproximatelyEqual(
      [
        "M-20 -20L20 0L0 60",
        "M0 0L20 20L20 40",
        "M0.002 0.002L20 20.002L20.002 39.998",
        "M20 20L20 40L40 20",
        "M20.002 20.002L20 40.002L40.002 19.998",
        "M24 24L20 44L44 16",
        "M40 40L20 60L60 0",
      ].join(" ")
    );
  });
  it("should add a path", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      const path2 = Skia.Path.Make();
      path.moveTo(20, 20);
      path.lineTo(20, 40);
      path.lineTo(40, 20);
      path2.moveTo(60, 60);
      path2.lineTo(80, 60);
      path2.lineTo(80, 40);
      const results: string[] = [];
      for (let j = 0; j < 2; j++) {
        const p = path.copy().addPath(path2, undefined, j === 1);
        results.push(p.toSVGString());
      }
      return results;
    });
    expect(result).toEqual([
      "M20 20L20 40L40 20M60 60L80 60L80 40",
      "M20 20L20 40L40 20L60 60L80 60L80 40",
    ]);
  });
  it("should draw a pattern properly", async () => {
    const { Skia } = importSkia();

    const center = { x: 492 / 2, y: 757 / 2 };
    const scale = 0.325;
    const strokeWidth = 10;

    const c1 = "#204E71";
    const c2 = "#4A759B";

    const whitePaint = Skia.Paint();
    whitePaint.setAntiAlias(true);
    whitePaint.setColor(Skia.Color("white"));

    const strokePaint = Skia.Paint();
    whitePaint.setAntiAlias(true);
    strokePaint.setStyle(PaintStyle.Stroke);
    strokePaint.setStrokeWidth(strokeWidth);

    const borders = Skia.Path.MakeFromSVGString(
      // eslint-disable-next-line max-len
      "M447.955 756.37H44.699C20.5664 756.37 0.820374 736.624 0.820374 712.492V44.8242C0.820374 20.6898 20.5664 0.945557 44.699 0.945557H447.955C472.088 0.945557 491.834 20.6898 491.834 44.8242V712.492C491.834 736.624 472.088 756.37 447.955 756.37Z"
    )!;

    const bg =
      // eslint-disable-next-line max-len
      "M423.554 40.0679H69.3443C51.3334 40.0679 36.6796 54.7199 36.6796 72.7307V685.881C36.6796 703.892 51.3334 718.546 69.3443 718.546H423.554C441.565 718.546 456.219 703.892 456.219 685.881V72.7307C456.219 54.7199 441.565 40.0679 423.554 40.0679Z";
    const Circles = () => {
      const c = 12;
      const delta = 100 / c;
      return (
        <>
          {new Array(c).fill(0).map((_, i) => {
            const r2 = i * delta;
            const path = Skia.Path.Make();
            path.addCircle(0, 0, r2);
            return (
              <Path
                key={i}
                path={path}
                style="stroke"
                strokeWidth={strokeWidth}
                color={i % 2 === 0 ? c1 : c2}
              />
            );
          })}
        </>
      );
    };

    const img = await surface.draw(
      <Group transform={[{ scale }]}>
        <Path path={borders} color="white" />
        <Path path={bg} color={c1} />
        {new Array(4).fill(0).map((_, i) => {
          const delta = i * strokeWidth;
          const rect = {
            x: -delta,
            y: -delta,
            width: center.x * 2 + delta * 2,
            height: center.y * 2 + delta * 2,
          };
          const path = Skia.Path.Make();
          path.addArc(rect, 0, 360).close();
          return (
            <Group key={i} origin={center} transform={[{ scale: 0.6 }]}>
              <Rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                color={i % 2 === 0 ? c1 : c2}
                style="stroke"
                strokeWidth={strokeWidth}
              />
              <Path
                path={path}
                color={i % 2 === 0 ? c1 : c2}
                style="stroke"
                strokeWidth={strokeWidth}
              />
            </Group>
          );
        })}
        <Group transform={[{ translate: [center.x, center.y] }]}>
          <Group transform={[{ translateY: -200 }]}>
            <Circles />
          </Group>
          <Group transform={[{ translateY: 200 }]}>
            <Circles />
          </Group>
          <Group transform={[{ translateX: -100 }]}>
            <Circles />
          </Group>
          <Group transform={[{ translateX: 100 }]}>
            <Circles />
          </Group>
        </Group>
      </Group>
    );
    checkImage(img, "snapshots/paths/pattern.png");
  });
  it("typename should be correct", async () => {
    const typename = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      return path.__typename__;
    });
    return expect(typename).toBe("Path");
  });
  it("should be possible to call dispose on a path", async () => {
    await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      path.moveTo(20, 20).lineTo(20, 40).lineTo(40, 20);
      path.dispose();
      return path;
    });
  });
  it("Path with default fillType", async () => {
    const { Skia } = importSkia();
    const path = star(Skia);
    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Path path={path} style="stroke" strokeWidth={4} color="#3EB489" />
        <Path path={path} color="lightblue" />
      </>
    );
    checkImage(img, docPath("paths/default-filltype.png"));
  });
  it("Path with even odd fillType", async () => {
    const { Skia } = importSkia();
    const path = star(Skia);
    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Path path={path} style="stroke" strokeWidth={4} color="#3EB489" />
        <Path path={path} color="lightblue" fillType="evenOdd" />
      </>
    );
    checkImage(img, docPath("paths/evenodd-filltype.png"));
  });
  it("Should interpolate paths", async () => {
    // https://fiddle.skia.org/c/@Path_isInterpolatable
    const { Skia } = importSkia();
    const path = Skia.Path.Make();
    const path2 = Skia.Path.Make();
    path.moveTo(20, 20);
    path.lineTo(40, 40);
    path.lineTo(20, 20);
    path.lineTo(40, 40);
    path.close();
    path2.addRect(Skia.XYWHRect(20, 20, 20, 20));
    expect(path.isInterpolatable(path2)).toBe(true);
    const result = path2.interpolate(path, 0.5)!;
    expect(result).toBeDefined();
    const img = await surface.draw(
      <Path path={result} style="stroke" strokeWidth={3} />
    );
    checkImage(img, "snapshots/paths/interpolation1.png");
  });
  it("Should interpolate paths with a pre-allocated Path (1)", async () => {
    // https://fiddle.skia.org/c/@Path_isInterpolatable
    const { Skia } = importSkia();
    const path = Skia.Path.Make();
    const path2 = Skia.Path.Make();
    path.moveTo(20, 20);
    path.lineTo(40, 40);
    path.lineTo(20, 20);
    path.lineTo(40, 40);
    path.close();
    path2.addRect(Skia.XYWHRect(20, 20, 20, 20));
    expect(path.isInterpolatable(path2)).toBe(true);
    const result = Skia.Path.Make();
    const result2 = path.interpolate(path2, 0.5, result);
    expect(result).toBeDefined();
    expect(result2).toBe(result);
    const img = await surface.draw(
      <Path path={result} style="stroke" strokeWidth={3} />
    );
    checkImage(img, "snapshots/paths/interpolation1.png");
  });
  it("Should interpolate paths with a pre-allocated Path (2)", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Make();
      const path2 = Skia.Path.Make();
      path.moveTo(20, 20);
      path.lineTo(40, 40);
      path.lineTo(20, 20);
      path.lineTo(40, 40);
      path.close();
      path2.addRect(Skia.XYWHRect(20, 20, 20, 20));
      const result3 = Skia.Path.Make();
      const result4 = path.interpolate(path2, 0.5, result3);
      return { identity: result3 === result4, result: result3.toSVGString() };
    });
    expect(result.identity).toBe(true);
    expect(result.result).toEqual("M20 20L40 30L30 30L30 40L20 20Z");
  });
  it("Shouldn't interpolate paths with a pre-allocated Path", async () => {
    // https://fiddle.skia.org/c/@Path_isInterpolatable
    const { Skia } = importSkia();
    const path = Skia.Path.Make();
    const path2 = Skia.Path.Make();
    path.moveTo(20, 20);
    path.lineTo(40, 40);
    path.lineTo(20, 20);
    path.lineTo(40, 40);
    path.lineTo(0, 0);
    path.close();
    path2.addRect(Skia.XYWHRect(20, 20, 20, 20));
    const result = Skia.Path.Make();
    const success = path.interpolate(path2, 0.5, result);
    expect(success).toBe(null);
    const img = await surface.draw(
      <Path path={result} style="stroke" strokeWidth={3} />
    );
    checkImage(img, "snapshots/paths/emptyPath.png");
  });
});
