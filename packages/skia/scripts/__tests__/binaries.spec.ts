import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..", "..");
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

// binaries.json is the checksums.json of a binaries-<version> release.
// Apple and Android consumers share the installed release pin. Native headers
// ship in this package; platform binary npm packages are not runtime dependencies.
describe("binaries.json", () => {
  const binaries = readJson("binaries.json");
  const { dependencies } = readJson("package.json");

  it("pins a release independently of binary npm dependencies", () => {
    expect(binaries.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(binaries.tag).toBe(`binaries-${binaries.version}`);
    expect(
      Object.keys(dependencies).filter(
        (name) =>
          name.startsWith("react-native-skia-graphite-") ||
          name === "react-native-webgpu-dawn"
      )
    ).toEqual([]);
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
