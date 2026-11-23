import { expect, test } from "playwright/test";

interface SmokeResult {
  pass: boolean;
  error?: string;
  gpuErrors?: string[];
  pendingGpuWork?: boolean;
  tiles?: { name: string; pass: boolean; drawn: boolean; center: number[] }[];
}

test("every Skia archive draws through Graphite on WebGPU", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/index.html");
  const handle = await page.waitForFunction(
    () => (window as unknown as { smoke?: SmokeResult }).smoke
  );
  const result = (await handle.jsonValue()) as SmokeResult;

  // Reported first: they explain a failure better than the pixel checks do.
  expect(result.error).toBeUndefined();
  expect(result.gpuErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  for (const tile of result.tiles ?? []) {
    expect(tile, `tile "${tile.name}"`).toMatchObject({
      drawn: true,
      pass: true,
    });
  }
  expect(result.tiles).toHaveLength(6);
  expect(result.pendingGpuWork).toBe(false);
  expect(result.pass).toBe(true);
});
