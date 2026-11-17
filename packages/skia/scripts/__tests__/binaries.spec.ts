import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..", "..");
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

// binaries.json is the checksums.json of a binaries-<version> release: what
// android/build.gradle downloads the Skia and Dawn archives from. The Apple
// builds still read the npm packages, and the Dawn package's version is what
// react-native-webgpu is paired on, so the two pins must not drift apart.
describe("binaries.json", () => {
  const binaries = readJson("binaries.json");
  const { dependencies } = readJson("package.json");

  it("names the version of the binary packages in package.json", () => {
    const pinned = Object.entries(dependencies).filter(
      ([name]) =>
        name.startsWith("react-native-skia-graphite-") ||
        name === "react-native-webgpu-dawn"
    );
    expect(pinned.length).toBeGreaterThan(0);
    for (const [name, version] of pinned) {
      expect({ name, version }).toEqual({ name, version: binaries.version });
    }
    expect(binaries.tag).toBe(`binaries-${binaries.version}`);
  });

  it("pins the archives Gradle downloads, for every ABI", () => {
    // The default of reactNativeArchitectures() in android/build.gradle.
    for (const abi of ["armeabi-v7a", "x86", "x86_64", "arm64-v8a"]) {
      for (const module of ["skia-graphite-android", "dawn-android"]) {
        const asset = binaries.assets[`${module}-${abi}.zip`];
        expect({ module, abi, sha256: asset?.sha256 }).toEqual({
          module,
          abi,
          sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        });
      }
    }
  });
});
