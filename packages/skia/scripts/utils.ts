import { spawn, execSync } from "child_process";
import fs, {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { exit } from "process";
import path from "path";

export const ensureFolderExists = (dirPath: string) => {
  try {
    console.log(`Ensuring that ${dirPath} exists...`);
    mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (err.code !== "EEXIST") {
      throw err;
    }
  }
};

export const runAsync = (command: string, label: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");
    console.log({ cmd, args });
    const childProcess = spawn(cmd, args, {
      shell: true,
    });

    childProcess.stdout.on("data", (data) => {
      process.stdout.write(`${label} ${data}`);
    });

    childProcess.stderr.on("data", (data) => {
      console.error(`${label} ${data}`);
    });

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });

    childProcess.on("error", (error) => {
      reject(new Error(`${label} ${error.message}`));
    });
  });
};

export const mapKeys = <T extends object>(obj: T) =>
  Object.keys(obj) as (keyof T)[];

export const checkFileExists = (filePath: string) => {
  const exists = existsSync(filePath);
  if (!exists) {
    console.log("");
    console.log("Failed:");
    console.log(filePath + " not found. (" + filePath + ")");
    console.log("");
    exit(1);
  } else {
    console.log("✅ " + filePath);
  }
};

export const $ = (command: string) => {
  try {
    return execSync(command);
  } catch (e) {
    exit(1);
  }
};

const serializeCMakeArgs = (args: Record<string, string>) => {
  return Object.keys(args)
    .map((key) => `-D${key}=${args[key]}`)
    .join(" ");
};

export const build = async (
  label: string,
  args: Record<string, string>,
  debugLabel: string
) => {
  console.log(`🔨 Building ${label}`);
  $(`mkdir -p externals/dawn/out/${label}`);
  process.chdir(`externals/dawn/out/${label}`);
  const cmd = `cmake ../.. -G Ninja ${serializeCMakeArgs(args)}`;
  await runAsync(cmd, debugLabel);
  await runAsync("ninja", debugLabel);
  process.chdir("../../../..");
};

export var copyRecursiveSync = function (src: string, dest: string) {
  if (!existsSync(src)) {
    throw new Error(`Cannot copy ${src}: it does not exist`);
  }
  var stats = statSync(src);
  var isDirectory = stats.isDirectory();
  if (isDirectory) {
    if (!existsSync(dest)) {
      mkdirSync(dest);
    }
    readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    copyFileSync(src, dest);
  }
};

// Cross-platform file operations abstraction
export const fileOps = {
  rm: (p: string) => {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
    }
  },

  mkdir: (p: string) => {
    fs.mkdirSync(p, { recursive: true });
  },

  cp: (src: string, dest: string) => {
    copyRecursiveSync(src, dest);
  },

  sed: (file: string, pattern: RegExp, replacement: string) => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      const updated = content.replace(pattern, replacement);
      fs.writeFileSync(file, updated, "utf8");
    }
  },
};
