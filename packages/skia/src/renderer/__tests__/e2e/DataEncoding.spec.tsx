import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

describe("Data Encoding", () => {
  itRunsE2eOnly("encodeToBytes() from CPU image", async () => {
    const result = await surface.eval((Skia) => {
      const data = Skia.Data.fromBase64(
        "R0lGODlhAQABAIAAAGGqHwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
      );
      const img = Skia.Image.MakeFromEncoded(data);
      if (!img) {
        return [];
      }
      return Array.from(img.encodeToBytes());
    });
    expect(result).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
      0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 3, 115, 66, 73, 84,
      8, 8, 8, 219, 225, 79, 224, 0, 0, 0, 1, 115, 82, 71, 66, 0, 174, 206, 28,
      233, 0, 0, 0, 12, 73, 68, 65, 84, 8, 153, 99, 72, 92, 37, 15, 0, 2, 154,
      1, 43, 48, 0, 62, 135, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ]);
  });
  itRunsE2eOnly("encodeToBase64() from CPU image", async () => {
    const result = await surface.eval((Skia) => {
      const data = Skia.Data.fromBase64(
        "R0lGODlhAQABAIAAAGGqHwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
      );
      const img = Skia.Image.MakeFromEncoded(data);
      if (!img) {
        return "";
      }
      return img.encodeToBase64();
    });
    expect(result).toEqual(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAA3NCSVQICAjb4U/gAAAAAXNSR0IArs4c6QAAAAxJREFUCJljSFwlDwACmgErMAA+hwAAAABJRU5ErkJggg=="
    );
  });
  it("encodeToBytes() from GPU image", async () => {
    const result = await surface.eval((Skia) => {
      const data = Skia.Data.fromBase64(
        "R0lGODlhAQABAIAAAGGqHwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
      );
      const img = Skia.Image.MakeFromEncoded(data);
      if (!img) {
        return [];
      }
      const offscreen = Skia.Surface.MakeOffscreen(1, 1)!;
      const canvas = offscreen.getCanvas();
      canvas.drawImage(img, 0, 0);
      const snapshotImage = Skia.Image.MakeNull();
      offscreen.makeImageSnapshot(undefined, snapshotImage);
      return Array.from(snapshotImage.encodeToBytes());
    });
    expect(result.length).toBeGreaterThan(0);
  });
  it("encodeToBase64() from GPU image", async () => {
    const result = await surface.eval((Skia) => {
      const data = Skia.Data.fromBase64(
        "R0lGODlhAQABAIAAAGGqHwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
      );
      const img = Skia.Image.MakeFromEncoded(data);
      if (!img) {
        return "";
      }
      const offscreen = Skia.Surface.MakeOffscreen(1, 1)!;
      const canvas = offscreen.getCanvas();
      canvas.drawImage(img, 0, 0);
      const snapshotImage = Skia.Image.MakeNull();
      offscreen.makeImageSnapshot(undefined, snapshotImage);
      return snapshotImage.encodeToBase64();
    });
    expect(result.length).toBeGreaterThan(0);
  });
});
