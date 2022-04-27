const fs = require("fs");
const path = require("path");

console.log("Updating symlinks for Android build...");

const createSymlink = (p) => {
  console.log(`Creating symlink to ${p}`, __dirname, process.cwd());
  const srcDir = path.resolve(`./cpp/${p}`);
  const dstDir = path.resolve(`./android/cpp/${p}`);

  if (!fs.existsSync(dstDir) || !fs.lstatSync(dstDir).isSymbolicLink()) {
    fs.symlinkSync(srcDir, dstDir, "junction");
  }
};

// Copy common cpp files from the package root to the android folder
createSymlink("api");
createSymlink("jsi");
createSymlink("rnskia");
createSymlink("skia");
createSymlink("utils");

console.log("Symlinks created successfully.");
