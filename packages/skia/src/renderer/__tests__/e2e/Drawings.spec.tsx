import React from "react";

import { checkImage } from "../../../__tests__/setup";
import {
  Blur,
  Circle,
  FitBox,
  Group,
  LinearGradient,
  Path,
  Rect,
  Image,
  BlurMask,
} from "../../components";
import { images, importSkia, surface } from "../setup";

describe("Drawings", () => {
  it("Should blend colors using multiplication", async () => {
    const { width, height } = surface;
    const r = width * 0.33;
    const image = await surface.draw(
      <Group blendMode="multiply">
        <Circle cx={r} cy={r} r={r} color="cyan" />
        <Circle cx={width - r} cy={r} r={r} color="magenta" />
        <Circle cx={width / 2} cy={height - r} r={r} color="yellow" />
      </Group>
    );
    checkImage(image, "snapshots/drawings/blend-mode-multiply.png");
  });

  it("Should use a blur image filter", async () => {
    const { width, height } = surface;
    const r = width * 0.33;
    const image = await surface.draw(
      <Group blendMode="multiply">
        <Blur blur={10} />
        <Circle cx={r} cy={r} r={r} color="cyan" />
        <Circle cx={width - r} cy={r} r={r} color="magenta" />
        <Circle cx={width / 2} cy={height - r} r={r} color="yellow" />
      </Group>
    );
    checkImage(image, "snapshots/drawings/blur2.png");
  });

  it("Should render a transform with the correct origin", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const r = width * 0.33;
    const image = await surface.draw(
      <Group
        blendMode="multiply"
        transform={[{ rotate: Math.PI }]}
        origin={Skia.Point(width / 2, height / 2)}
      >
        <Circle cx={r} cy={r} r={r} color={Skia.Color("cyan")} />
        <Circle cx={width - r} cy={r} r={r} color={Skia.Color("magenta")} />
        <Circle
          cx={width / 2}
          cy={height - r}
          r={r}
          color={Skia.Color("yellow")}
        />
      </Group>
    );
    checkImage(image, "snapshots/drawings/transform-origin.png");
  });

  it("Should do rect marshalling properly", async () => {
    const result = await surface.eval((Skia) => {
      const path = Skia.Path.Rect({ x: 0, y: 0, width: 100, height: 100 });
      return path.getBounds().width;
    });
    expect(result).toBe(100);
  });

  it("Should render the Skia logo with proper stroke joins and caps", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const path = Skia.Path.MakeFromSVGString(
      "M512.213 204.005C500.312 185.697 406.758 105.581 332.94 105.581C259.122 105.581 219.088 132 204.638 149.85C157.952 207.52 141.933 264.275 156.579 320.115C175.803 387.854 228.896 449.644 315.859 505.483C415.638 562.238 479.716 626.774 508.093 699.091C518.163 731.13 519.536 762.711 512.213 793.835C504.889 824.959 490.243 853.336 468.273 878.967C449.965 903.683 425.707 921.534 395.499 932.518C365.291 942.588 328.675 950.369 285.651 955.861C182.21 964.1 97.9935 948.538 33 909.176M595.972 733.419C710.397 564.985 795.529 424.47 851.369 311.876C865.1 279.837 875.169 255.579 881.577 239.102C887.985 221.709 894.393 198.824 900.801 170.447C907.208 142.069 909.497 115.98 907.666 92.1797C904.92 68.3793 893.02 51.9021 871.965 40.0019C850.911 28.1016 835.5 31.3101 811.549 44.1212C772.187 65.1754 745.64 101.334 731.909 152.596C723.67 174.566 715.432 200.197 707.193 229.49C699.87 258.783 694.378 281.21 690.716 296.772C687.97 312.334 682.935 340.711 675.612 381.904C668.289 422.182 663.712 445.982 661.881 453.306C643.573 567.731 621.603 733.876 595.972 951.742C624.349 852.878 656.846 774.154 693.462 715.568C706.278 689.937 717.263 669.798 726.417 655.152C735.571 640.505 748.844 624.486 766.237 607.093C784.545 589.701 803.768 576.885 823.907 568.646C892.562 543.015 941.994 545.304 972.202 575.512C990.51 594.735 999.664 618.078 999.664 645.54C1000.58 673.002 990.052 694.514 968.083 710.076C925.059 733.876 859.608 741.657 771.729 733.419C786.375 737.996 797.36 742.115 804.683 745.776C812.922 748.523 822.992 753.1 834.892 759.508C847.707 765.915 857.319 773.696 863.727 782.85C871.05 792.004 875.627 802.531 877.458 814.432C878.373 819.009 879.746 827.705 881.577 840.521C884.323 853.336 886.612 862.948 888.443 869.356C890.273 875.763 892.562 884.002 895.308 894.072C898.97 904.141 903.089 912.837 907.666 920.16C913.159 926.568 919.566 932.976 926.89 939.384C949.775 961.354 987.764 958.607 1040.86 931.145C1056.42 923.822 1070.61 914.668 1083.42 903.683C1097.15 892.698 1109.97 879.425 1121.87 863.863C1134.69 847.386 1144.76 834.113 1152.08 824.043C1159.4 813.058 1169.47 797.039 1182.29 775.985C1195.1 754.931 1204.26 740.742 1209.75 733.419C1239.04 674.833 1268.33 616.247 1297.63 557.661C1252.77 670.256 1223.94 756.304 1211.12 815.805C1205.63 833.197 1203.34 853.336 1204.26 876.221C1205.17 899.106 1212.04 917.414 1224.85 931.145C1234.01 942.13 1245.45 949.453 1259.18 953.115C1273.83 956.777 1287.56 956.319 1300.37 951.742C1356.21 935.265 1401.53 903.226 1436.31 855.625C1456.45 828.163 1483.45 787.427 1517.32 733.419M1360.79 390.143C1347.97 390.143 1340.19 384.193 1337.45 372.293C1335.62 359.477 1336.99 348.492 1341.57 339.338C1345.24 332 1357.13 333.846 1369.03 333.846C1380.93 333.846 1390.5 340.5 1391 348.95M1925.13 697.718C1902.25 633.64 1874.33 593.82 1841.38 578.258C1810.25 559.95 1775.47 551.254 1737.02 552.169C1698.57 552.169 1664.25 562.238 1634.04 582.377C1605.66 598.855 1581.4 620.824 1561.26 648.286C1541.12 674.833 1527.39 704.126 1520.07 736.165C1513.66 767.288 1514.58 798.87 1522.82 830.909C1531.97 862.032 1547.53 888.579 1569.5 910.549C1604.29 939.842 1646.4 954.488 1695.83 954.488C1745.26 954.488 1787.82 939.842 1823.53 910.549C1838.17 895.902 1848.7 885.375 1855.11 878.967C1861.51 872.56 1868.84 863.406 1877.08 851.505C1886.23 839.605 1893.55 827.247 1899.05 814.432M1958.09 556.288C1933.37 657.898 1916.9 746.234 1908.66 821.297C1900.42 878.967 1911.4 918.787 1941.61 940.757C1964.5 959.065 2000.2 956.319 2048.71 932.518C2090.82 912.38 2131.1 873.017 2169.55 814.432"
    )!;
    const PADDING = width / 16;
    const image = await surface.draw(
      <FitBox
        src={Skia.XYWHRect(0, 0, 2139, 928)}
        dst={Skia.XYWHRect(
          PADDING,
          PADDING,
          width - PADDING * 2,
          height - PADDING * 2
        )}
      >
        <Group strokeJoin="round" strokeCap="round">
          <LinearGradient
            start={path.getPoint(0)}
            end={path.getLastPt()}
            colors={[
              "#3FCEBC",
              "#3CBCEB",
              "#5F96E7",
              "#816FE3",
              "#9F5EE2",
              "#DE589F",
              "#FF645E",
              "#FDA859",
              "#FAEC54",
              "#9EE671",
              "#41E08D",
            ]}
          />
          <Path path={path} style="stroke" strokeWidth={116} />
        </Group>
      </FitBox>
    );
    checkImage(image, "snapshots/paths/skia.png");
  });

  it("Should trim a path properly", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const path = Skia.Path.MakeFromSVGString(
      "M512.213 204.005C500.312 185.697 406.758 105.581 332.94 105.581C259.122 105.581 219.088 132 204.638 149.85C157.952 207.52 141.933 264.275 156.579 320.115C175.803 387.854 228.896 449.644 315.859 505.483C415.638 562.238 479.716 626.774 508.093 699.091C518.163 731.13 519.536 762.711 512.213 793.835C504.889 824.959 490.243 853.336 468.273 878.967C449.965 903.683 425.707 921.534 395.499 932.518C365.291 942.588 328.675 950.369 285.651 955.861C182.21 964.1 97.9935 948.538 33 909.176M595.972 733.419C710.397 564.985 795.529 424.47 851.369 311.876C865.1 279.837 875.169 255.579 881.577 239.102C887.985 221.709 894.393 198.824 900.801 170.447C907.208 142.069 909.497 115.98 907.666 92.1797C904.92 68.3793 893.02 51.9021 871.965 40.0019C850.911 28.1016 835.5 31.3101 811.549 44.1212C772.187 65.1754 745.64 101.334 731.909 152.596C723.67 174.566 715.432 200.197 707.193 229.49C699.87 258.783 694.378 281.21 690.716 296.772C687.97 312.334 682.935 340.711 675.612 381.904C668.289 422.182 663.712 445.982 661.881 453.306C643.573 567.731 621.603 733.876 595.972 951.742C624.349 852.878 656.846 774.154 693.462 715.568C706.278 689.937 717.263 669.798 726.417 655.152C735.571 640.505 748.844 624.486 766.237 607.093C784.545 589.701 803.768 576.885 823.907 568.646C892.562 543.015 941.994 545.304 972.202 575.512C990.51 594.735 999.664 618.078 999.664 645.54C1000.58 673.002 990.052 694.514 968.083 710.076C925.059 733.876 859.608 741.657 771.729 733.419C786.375 737.996 797.36 742.115 804.683 745.776C812.922 748.523 822.992 753.1 834.892 759.508C847.707 765.915 857.319 773.696 863.727 782.85C871.05 792.004 875.627 802.531 877.458 814.432C878.373 819.009 879.746 827.705 881.577 840.521C884.323 853.336 886.612 862.948 888.443 869.356C890.273 875.763 892.562 884.002 895.308 894.072C898.97 904.141 903.089 912.837 907.666 920.16C913.159 926.568 919.566 932.976 926.89 939.384C949.775 961.354 987.764 958.607 1040.86 931.145C1056.42 923.822 1070.61 914.668 1083.42 903.683C1097.15 892.698 1109.97 879.425 1121.87 863.863C1134.69 847.386 1144.76 834.113 1152.08 824.043C1159.4 813.058 1169.47 797.039 1182.29 775.985C1195.1 754.931 1204.26 740.742 1209.75 733.419C1239.04 674.833 1268.33 616.247 1297.63 557.661C1252.77 670.256 1223.94 756.304 1211.12 815.805C1205.63 833.197 1203.34 853.336 1204.26 876.221C1205.17 899.106 1212.04 917.414 1224.85 931.145C1234.01 942.13 1245.45 949.453 1259.18 953.115C1273.83 956.777 1287.56 956.319 1300.37 951.742C1356.21 935.265 1401.53 903.226 1436.31 855.625C1456.45 828.163 1483.45 787.427 1517.32 733.419M1360.79 390.143C1347.97 390.143 1340.19 384.193 1337.45 372.293C1335.62 359.477 1336.99 348.492 1341.57 339.338C1345.24 332 1357.13 333.846 1369.03 333.846C1380.93 333.846 1390.5 340.5 1391 348.95M1925.13 697.718C1902.25 633.64 1874.33 593.82 1841.38 578.258C1810.25 559.95 1775.47 551.254 1737.02 552.169C1698.57 552.169 1664.25 562.238 1634.04 582.377C1605.66 598.855 1581.4 620.824 1561.26 648.286C1541.12 674.833 1527.39 704.126 1520.07 736.165C1513.66 767.288 1514.58 798.87 1522.82 830.909C1531.97 862.032 1547.53 888.579 1569.5 910.549C1604.29 939.842 1646.4 954.488 1695.83 954.488C1745.26 954.488 1787.82 939.842 1823.53 910.549C1838.17 895.902 1848.7 885.375 1855.11 878.967C1861.51 872.56 1868.84 863.406 1877.08 851.505C1886.23 839.605 1893.55 827.247 1899.05 814.432M1958.09 556.288C1933.37 657.898 1916.9 746.234 1908.66 821.297C1900.42 878.967 1911.4 918.787 1941.61 940.757C1964.5 959.065 2000.2 956.319 2048.71 932.518C2090.82 912.38 2131.1 873.017 2169.55 814.432"
    )!;
    const PADDING = width / 16;
    const image = await surface.draw(
      <FitBox
        src={Skia.XYWHRect(0, 0, 2139, 928)}
        dst={Skia.XYWHRect(
          PADDING,
          PADDING,
          width - PADDING * 2,
          height - PADDING * 2
        )}
      >
        <Group strokeJoin="round" strokeCap="round" color="black">
          <Path path={path} style="stroke" strokeWidth={116} end={0.5} />
        </Group>
      </FitBox>
    );
    checkImage(image, "snapshots/paths/skia-trimmed.png");
  });

  it("Should clamp the trim values automatically (1)", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const path = Skia.Path.MakeFromSVGString(
      "M512.213 204.005C500.312 185.697 406.758 105.581 332.94 105.581C259.122 105.581 219.088 132 204.638 149.85C157.952 207.52 141.933 264.275 156.579 320.115C175.803 387.854 228.896 449.644 315.859 505.483C415.638 562.238 479.716 626.774 508.093 699.091C518.163 731.13 519.536 762.711 512.213 793.835C504.889 824.959 490.243 853.336 468.273 878.967C449.965 903.683 425.707 921.534 395.499 932.518C365.291 942.588 328.675 950.369 285.651 955.861C182.21 964.1 97.9935 948.538 33 909.176M595.972 733.419C710.397 564.985 795.529 424.47 851.369 311.876C865.1 279.837 875.169 255.579 881.577 239.102C887.985 221.709 894.393 198.824 900.801 170.447C907.208 142.069 909.497 115.98 907.666 92.1797C904.92 68.3793 893.02 51.9021 871.965 40.0019C850.911 28.1016 835.5 31.3101 811.549 44.1212C772.187 65.1754 745.64 101.334 731.909 152.596C723.67 174.566 715.432 200.197 707.193 229.49C699.87 258.783 694.378 281.21 690.716 296.772C687.97 312.334 682.935 340.711 675.612 381.904C668.289 422.182 663.712 445.982 661.881 453.306C643.573 567.731 621.603 733.876 595.972 951.742C624.349 852.878 656.846 774.154 693.462 715.568C706.278 689.937 717.263 669.798 726.417 655.152C735.571 640.505 748.844 624.486 766.237 607.093C784.545 589.701 803.768 576.885 823.907 568.646C892.562 543.015 941.994 545.304 972.202 575.512C990.51 594.735 999.664 618.078 999.664 645.54C1000.58 673.002 990.052 694.514 968.083 710.076C925.059 733.876 859.608 741.657 771.729 733.419C786.375 737.996 797.36 742.115 804.683 745.776C812.922 748.523 822.992 753.1 834.892 759.508C847.707 765.915 857.319 773.696 863.727 782.85C871.05 792.004 875.627 802.531 877.458 814.432C878.373 819.009 879.746 827.705 881.577 840.521C884.323 853.336 886.612 862.948 888.443 869.356C890.273 875.763 892.562 884.002 895.308 894.072C898.97 904.141 903.089 912.837 907.666 920.16C913.159 926.568 919.566 932.976 926.89 939.384C949.775 961.354 987.764 958.607 1040.86 931.145C1056.42 923.822 1070.61 914.668 1083.42 903.683C1097.15 892.698 1109.97 879.425 1121.87 863.863C1134.69 847.386 1144.76 834.113 1152.08 824.043C1159.4 813.058 1169.47 797.039 1182.29 775.985C1195.1 754.931 1204.26 740.742 1209.75 733.419C1239.04 674.833 1268.33 616.247 1297.63 557.661C1252.77 670.256 1223.94 756.304 1211.12 815.805C1205.63 833.197 1203.34 853.336 1204.26 876.221C1205.17 899.106 1212.04 917.414 1224.85 931.145C1234.01 942.13 1245.45 949.453 1259.18 953.115C1273.83 956.777 1287.56 956.319 1300.37 951.742C1356.21 935.265 1401.53 903.226 1436.31 855.625C1456.45 828.163 1483.45 787.427 1517.32 733.419M1360.79 390.143C1347.97 390.143 1340.19 384.193 1337.45 372.293C1335.62 359.477 1336.99 348.492 1341.57 339.338C1345.24 332 1357.13 333.846 1369.03 333.846C1380.93 333.846 1390.5 340.5 1391 348.95M1925.13 697.718C1902.25 633.64 1874.33 593.82 1841.38 578.258C1810.25 559.95 1775.47 551.254 1737.02 552.169C1698.57 552.169 1664.25 562.238 1634.04 582.377C1605.66 598.855 1581.4 620.824 1561.26 648.286C1541.12 674.833 1527.39 704.126 1520.07 736.165C1513.66 767.288 1514.58 798.87 1522.82 830.909C1531.97 862.032 1547.53 888.579 1569.5 910.549C1604.29 939.842 1646.4 954.488 1695.83 954.488C1745.26 954.488 1787.82 939.842 1823.53 910.549C1838.17 895.902 1848.7 885.375 1855.11 878.967C1861.51 872.56 1868.84 863.406 1877.08 851.505C1886.23 839.605 1893.55 827.247 1899.05 814.432M1958.09 556.288C1933.37 657.898 1916.9 746.234 1908.66 821.297C1900.42 878.967 1911.4 918.787 1941.61 940.757C1964.5 959.065 2000.2 956.319 2048.71 932.518C2090.82 912.38 2131.1 873.017 2169.55 814.432"
    )!;
    const PADDING = width / 16;
    const image = await surface.draw(
      <FitBox
        src={Skia.XYWHRect(0, 0, 2139, 928)}
        dst={Skia.XYWHRect(
          PADDING,
          PADDING,
          width - PADDING * 2,
          height - PADDING * 2
        )}
      >
        <Group strokeJoin="round" strokeCap="round" color="black">
          <Path path={path} style="stroke" strokeWidth={116} end={1.009}>
            <LinearGradient
              start={path.getPoint(0)}
              end={path.getLastPt()}
              colors={[
                "#3FCEBC",
                "#3CBCEB",
                "#5F96E7",
                "#816FE3",
                "#9F5EE2",
                "#DE589F",
                "#FF645E",
                "#FDA859",
                "#FAEC54",
                "#9EE671",
                "#41E08D",
              ]}
            />
          </Path>
        </Group>
      </FitBox>
    );
    checkImage(image, "snapshots/paths/skia.png");
  });

  it("Should clamp the trim values automatically (2)", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const path = Skia.Path.MakeFromSVGString(
      "M512.213 204.005C500.312 185.697 406.758 105.581 332.94 105.581C259.122 105.581 219.088 132 204.638 149.85C157.952 207.52 141.933 264.275 156.579 320.115C175.803 387.854 228.896 449.644 315.859 505.483C415.638 562.238 479.716 626.774 508.093 699.091C518.163 731.13 519.536 762.711 512.213 793.835C504.889 824.959 490.243 853.336 468.273 878.967C449.965 903.683 425.707 921.534 395.499 932.518C365.291 942.588 328.675 950.369 285.651 955.861C182.21 964.1 97.9935 948.538 33 909.176M595.972 733.419C710.397 564.985 795.529 424.47 851.369 311.876C865.1 279.837 875.169 255.579 881.577 239.102C887.985 221.709 894.393 198.824 900.801 170.447C907.208 142.069 909.497 115.98 907.666 92.1797C904.92 68.3793 893.02 51.9021 871.965 40.0019C850.911 28.1016 835.5 31.3101 811.549 44.1212C772.187 65.1754 745.64 101.334 731.909 152.596C723.67 174.566 715.432 200.197 707.193 229.49C699.87 258.783 694.378 281.21 690.716 296.772C687.97 312.334 682.935 340.711 675.612 381.904C668.289 422.182 663.712 445.982 661.881 453.306C643.573 567.731 621.603 733.876 595.972 951.742C624.349 852.878 656.846 774.154 693.462 715.568C706.278 689.937 717.263 669.798 726.417 655.152C735.571 640.505 748.844 624.486 766.237 607.093C784.545 589.701 803.768 576.885 823.907 568.646C892.562 543.015 941.994 545.304 972.202 575.512C990.51 594.735 999.664 618.078 999.664 645.54C1000.58 673.002 990.052 694.514 968.083 710.076C925.059 733.876 859.608 741.657 771.729 733.419C786.375 737.996 797.36 742.115 804.683 745.776C812.922 748.523 822.992 753.1 834.892 759.508C847.707 765.915 857.319 773.696 863.727 782.85C871.05 792.004 875.627 802.531 877.458 814.432C878.373 819.009 879.746 827.705 881.577 840.521C884.323 853.336 886.612 862.948 888.443 869.356C890.273 875.763 892.562 884.002 895.308 894.072C898.97 904.141 903.089 912.837 907.666 920.16C913.159 926.568 919.566 932.976 926.89 939.384C949.775 961.354 987.764 958.607 1040.86 931.145C1056.42 923.822 1070.61 914.668 1083.42 903.683C1097.15 892.698 1109.97 879.425 1121.87 863.863C1134.69 847.386 1144.76 834.113 1152.08 824.043C1159.4 813.058 1169.47 797.039 1182.29 775.985C1195.1 754.931 1204.26 740.742 1209.75 733.419C1239.04 674.833 1268.33 616.247 1297.63 557.661C1252.77 670.256 1223.94 756.304 1211.12 815.805C1205.63 833.197 1203.34 853.336 1204.26 876.221C1205.17 899.106 1212.04 917.414 1224.85 931.145C1234.01 942.13 1245.45 949.453 1259.18 953.115C1273.83 956.777 1287.56 956.319 1300.37 951.742C1356.21 935.265 1401.53 903.226 1436.31 855.625C1456.45 828.163 1483.45 787.427 1517.32 733.419M1360.79 390.143C1347.97 390.143 1340.19 384.193 1337.45 372.293C1335.62 359.477 1336.99 348.492 1341.57 339.338C1345.24 332 1357.13 333.846 1369.03 333.846C1380.93 333.846 1390.5 340.5 1391 348.95M1925.13 697.718C1902.25 633.64 1874.33 593.82 1841.38 578.258C1810.25 559.95 1775.47 551.254 1737.02 552.169C1698.57 552.169 1664.25 562.238 1634.04 582.377C1605.66 598.855 1581.4 620.824 1561.26 648.286C1541.12 674.833 1527.39 704.126 1520.07 736.165C1513.66 767.288 1514.58 798.87 1522.82 830.909C1531.97 862.032 1547.53 888.579 1569.5 910.549C1604.29 939.842 1646.4 954.488 1695.83 954.488C1745.26 954.488 1787.82 939.842 1823.53 910.549C1838.17 895.902 1848.7 885.375 1855.11 878.967C1861.51 872.56 1868.84 863.406 1877.08 851.505C1886.23 839.605 1893.55 827.247 1899.05 814.432M1958.09 556.288C1933.37 657.898 1916.9 746.234 1908.66 821.297C1900.42 878.967 1911.4 918.787 1941.61 940.757C1964.5 959.065 2000.2 956.319 2048.71 932.518C2090.82 912.38 2131.1 873.017 2169.55 814.432"
    )!;
    const PADDING = width / 16;
    const image = await surface.draw(
      <FitBox
        src={Skia.XYWHRect(0, 0, 2139, 928)}
        dst={Skia.XYWHRect(
          PADDING,
          PADDING,
          width - PADDING * 2,
          height - PADDING * 2
        )}
      >
        <Group strokeJoin="round" strokeCap="round" color="black">
          <Path
            path={path}
            style="stroke"
            strokeWidth={116}
            end={0.9999999999999998}
          >
            <LinearGradient
              start={path.getPoint(0)}
              end={path.getLastPt()}
              colors={[
                "#3FCEBC",
                "#3CBCEB",
                "#5F96E7",
                "#816FE3",
                "#9F5EE2",
                "#DE589F",
                "#FF645E",
                "#FDA859",
                "#FAEC54",
                "#9EE671",
                "#41E08D",
              ]}
            />
          </Path>
        </Group>
      </FitBox>
    );
    checkImage(image, "snapshots/paths/skia.png");
  });

  it("should use default props (1)", async () => {
    const image = await surface.draw(
      <Group strokeJoin="round" strokeCap="round" color="black">
        <Rect width={64} height={64} color="lightblue" />
        <Circle r={128} color="rgba(100, 200, 300, 0.5)" />
      </Group>
    );
    checkImage(image, "snapshots/drawings/default-props.png");
  });

  it("should use default props for Images (2)", async () => {
    const { oslo } = images;
    const { width, height } = surface;
    const image = await surface.draw(
      <Group>
        <Image image={oslo} x={0} y={0} width={width} height={height} />
      </Group>
    );
    checkImage(image, "snapshots/drawings/image-default-props.png");
  });
  it("Should use the zIndex (1)", async () => {
    const { width, height } = surface;
    const r = width * 0.33;
    const image = await surface.draw(
      <Group>
        <BlurMask style="solid" blur={10} />
        <Circle cx={r} cy={r} r={r} color="cyan" zIndex={2} />
        <Circle cx={width - r} cy={r} r={r} color="magenta" zIndex={1} />
        <Circle
          cx={width / 2}
          cy={height - r}
          r={r}
          color="yellow"
          zIndex={0}
        />
      </Group>
    );
    checkImage(image, "snapshots/drawings/zIndex.png");
  });

  it("Should use the zIndex (2)", async () => {
    const { width, height } = surface;
    const r = width * 0.33;
    const image = await surface.draw(
      <Group>
        <BlurMask style="solid" blur={10} />
        <Circle cx={r} cy={r} r={r} color="cyan" zIndex={2} />
        <Circle cx={width - r} cy={r} r={r} color="magenta" zIndex={1}>
          <BlurMask style="solid" blur={0} />
        </Circle>
        <Circle cx={width / 2} cy={height - r} r={r} color="yellow" />
      </Group>
    );
    checkImage(image, "snapshots/drawings/zIndex2.png");
  });
  it("Should use negative zIndex", async () => {
    const { width, height } = surface;
    const r = width * 0.33;
    const image = await surface.draw(
      <Group>
        <Circle cx={r} cy={r} r={r} color="cyan" zIndex={-1} />
        <Circle cx={width - r} cy={r} r={r} color="magenta" zIndex={0} />
        <Circle
          cx={width / 2}
          cy={height - r}
          r={r}
          color="yellow"
          zIndex={1}
        />
      </Group>
    );
    checkImage(image, "snapshots/drawings/zIndex-negative.png");
  });
  it("Should use mixed zIndex", async () => {
    const { width, height } = surface;
    const r = width * 0.33;
    const image = await surface.draw(
      <Group>
        <Circle cx={r} cy={r} r={r} color="cyan" zIndex={10} />
        <Circle cx={width - r} cy={r} r={r} color="magenta" zIndex={-5} />
        <Circle
          cx={width / 2}
          cy={height - r}
          r={r}
          color="yellow"
          zIndex={0}
        />
        <Circle cx={width / 2} cy={r} r={r} color="red" zIndex={5} />
      </Group>
    );
    checkImage(image, "snapshots/drawings/zIndex-mixed.png");
  });
  it("Should preserve Paint context when zIndex is applied", async () => {
    const { width, height } = surface;
    const half = width / 2;
    const image = await surface.draw(
      <Group color="blue">
        <Group color="red" zIndex={1}>
          {/* This Rect receives its color exclusively from the Paint context. */}
          <Rect x={0} y={0} width={half} height={height} />
        </Group>
        <Rect x={half} y={0} width={half} height={height} zIndex={0} />
      </Group>
    );
    checkImage(image, "snapshots/drawings/zIndex-paint.png");
  });
  it("Should respect zIndex scoping in sibling Groups", async () => {
    const { width, height } = surface;
    const r = width * 0.33;
    // Group 1 is drawn first.
    // Inside Group 1: Cyan (zIndex 10) is drawn after Magenta (zIndex 0).
    // Group 2 is drawn second.
    // Inside Group 2: Yellow (zIndex -10) is drawn before others in Group 2 (none here).
    // Result: Group 2 (Yellow) should be ON TOP of Group 1 (Cyan), despite Cyan having higher zIndex.
    const image = await surface.draw(
      <>
        <Group>
          <Circle cx={width - r} cy={r} r={r} color="magenta" zIndex={0} />
          <Circle cx={r} cy={r} r={r} color="cyan" zIndex={10} />
        </Group>
        <Group>
          <Circle
            cx={width / 2}
            cy={height - r}
            r={r}
            color="yellow"
            zIndex={-10}
          />
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/zIndex-nested.png");
  });

  it("Should respect zIndex on sibling Groups", async () => {
    const { width } = surface;
    const r = width * 0.33;
    // Group 1 (Cyan) has zIndex 10, so it should be drawn ON TOP of Group 2 (Yellow, zIndex 0)
    // even though Group 2 is defined later.
    const image = await surface.draw(
      <>
        <Group zIndex={10}>
          <Circle cx={r} cy={r} r={r} color="cyan" />
        </Group>
        <Group zIndex={0}>
          <Circle cx={width - r} cy={r} r={r} color="yellow" />
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/zIndex-groups.png");
  });

  it("Should respect zIndex scoping with internal zIndex in sibling Groups", async () => {
    const { width, height } = surface;
    const r = width * 0.25;
    const cx = width / 2;
    const cy = height / 2;

    // Group 1 (zIndex 10) -> Drawn TOP
    //   - Cyan (zIndex -100)
    //   - Magenta (zIndex 50)
    // Group 2 (zIndex 0) -> Drawn BOTTOM
    //   - Yellow (zIndex 100)
    //   - Black (zIndex -50)

    // Expected Order (Bottom to Top):
    // 1. Group 2: Black (-50)
    // 2. Group 2: Yellow (100)
    // 3. Group 1: Cyan (-100)
    // 4. Group 1: Magenta (50)

    const image = await surface.draw(
      <>
        <Group zIndex={10}>
          <Circle cx={cx - 40} cy={cy - 40} r={r} color="cyan" zIndex={-100} />
          <Circle cx={cx + 40} cy={cy - 40} r={r} color="magenta" zIndex={50} />
        </Group>
        <Group zIndex={0}>
          <Circle cx={cx - 40} cy={cy + 40} r={r} color="yellow" zIndex={100} />
          <Circle cx={cx + 40} cy={cy + 40} r={r} color="black" zIndex={-50} />
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/zIndex-groups-internal.png");
  });

  it("Should respect zIndex in deeply nested Groups", async () => {
    const { width, height } = surface;
    const r = width * 0.2;
    const cx = width / 2;
    const cy = height / 2;

    // Hierarchy:
    // Root
    //  - Group A (zIndex 10) -> Drawn TOP
    //      - Group A1 (zIndex 5) -> Drawn TOP of A
    //          - Red (zIndex 1)
    //          - Orange (zIndex 2)
    //      - Group A2 (zIndex 1) -> Drawn BOTTOM of A
    //          - Blue (zIndex 1)
    //          - Purple (zIndex 2)
    //  - Group B (zIndex 0) -> Drawn BOTTOM
    //      - Green (zIndex 100)
    //      - Gray (zIndex -100)

    // Expected Order (Bottom to Top):
    // 1. Group B: Gray (-100)
    // 2. Group B: Green (100)
    // 3. Group A -> Group A2: Blue (1)
    // 4. Group A -> Group A2: Purple (2)
    // 5. Group A -> Group A1: Red (1)
    // 6. Group A -> Group A1: Orange (2)

    const image = await surface.draw(
      <>
        <Group zIndex={10}>
          <Group zIndex={5}>
            <Circle cx={cx - 30} cy={cy - 30} r={r} color="red" zIndex={1} />
            <Circle cx={cx - 10} cy={cy - 10} r={r} color="orange" zIndex={2} />
          </Group>
          <Group zIndex={1}>
            <Circle cx={cx + 30} cy={cy - 30} r={r} color="blue" zIndex={1} />
            <Circle cx={cx + 50} cy={cy - 10} r={r} color="purple" zIndex={2} />
          </Group>
        </Group>
        <Group zIndex={0}>
          <Circle cx={cx} cy={cy + 50} r={r} color="green" zIndex={100} />
          <Circle cx={cx} cy={cy + 70} r={r} color="gray" zIndex={-100} />
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/zIndex-nested-deep.png");
  });
});
