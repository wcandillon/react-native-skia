import { CI, checkImage, itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

const testSnapshot = async (name: string, maxPixelDiff = 200) => {
  const img = await surface.screen(name);
  checkImage(img, output(name.toLowerCase()), { maxPixelDiff });
};

const output = (name: string) =>
  `snapshots/screens/${name}-${surface.OS}${CI ? "-ci" : ""}.png`;

describe("Snapshot", () => {
  itRunsE2eOnly("should capture a simple snapshot", async () => {
    await testSnapshot("Snapshot1");
  });
  itRunsE2eOnly("should capture a somewhat complex snapshot", async () => {
    // text spacing on the fabric example app is slightly different
    await testSnapshot("Snapshot2", 5000);
  });
  itRunsE2eOnly("should respect overflow: hidden", async () => {
    await testSnapshot("Snapshot3");
  });
  itRunsE2eOnly("should respect overflow: hidden", async () => {
    await testSnapshot("Snapshot4");
  });
  itRunsE2eOnly("clipping test 1", async () => {
    await testSnapshot("Snapshot6");
  });
  itRunsE2eOnly("clipping test 2", async () => {
    await testSnapshot("Snapshot7");
  });
  itRunsE2eOnly("should not double-apply root padding", async () => {
    await testSnapshot("Snapshot8");
  });
  itRunsE2eOnly("should render elevation/shadow", async () => {
    await testSnapshot("Snapshot9");
  });
  // itRunsE2eOnly("should respect ScrollView offset and padding", async () => {
  //   await testSnapshot("Snapshot5");
  // });
});
