import fs from "fs";
import os from "os";
import path from "path";

import { copyRecursiveSync } from "../utils";

describe("copyRecursiveSync", () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "copy-recursive-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("fails on a source that does not exist, creating nothing", () => {
    const destination = path.join(directory, "destination");
    expect(() =>
      copyRecursiveSync(path.join(directory, "missing"), destination)
    ).toThrow("does not exist");
    expect(fs.existsSync(destination)).toBe(false);
  });

  it("copies a directory tree", () => {
    const source = path.join(directory, "source");
    fs.mkdirSync(path.join(source, "nested"), { recursive: true });
    fs.writeFileSync(path.join(source, "nested", "header.h"), "#pragma once\n");
    const destination = path.join(directory, "destination");
    copyRecursiveSync(source, destination);
    expect(
      fs.readFileSync(path.join(destination, "nested", "header.h"), "utf8")
    ).toBe("#pragma once\n");
  });
});
