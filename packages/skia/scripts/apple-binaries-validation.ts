/**
 * Validate every Mach-O object in Apple static libraries against its SDK and architectures.
 * Catch mixed-platform or incorrect-architecture objects before publishing raw .a archives,
 * since SDK builds no longer create XCFrameworks that would reject mixed platforms.
 */

import fs from "fs";

import type { AppleArchitecture, AppleSDK } from "./apple-configuration";

// LC_BUILD_VERSION platform identifiers from mach-o/loader.h.
const platforms = {
  iphoneos: { id: 2, name: "IOS" },
  iphonesimulator: { id: 7, name: "IOSSIMULATOR" },
  maccatalyst: { id: 6, name: "MACCATALYST" },
  appletvos: { id: 3, name: "TVOS" },
  appletvsimulator: { id: 8, name: "TVOSSIMULATOR" },
  macos: { id: 1, name: "MACOS" },
  xros: { id: 11, name: "VISIONOS" },
  xrsimulator: { id: 12, name: "VISIONOSSIMULATOR" },
};

/**
 * Check every object in a thin or universal .a, including each fat slice.
 * Read only archive headers and Mach-O load commands; no extraction or tools.
 */
export const validateAppleArchive = (
  file: string,
  sdk: AppleSDK,
  expectedArchitectures: AppleArchitecture[]
) => {
  const expectedPlatform = platforms[sdk];
  const seen = new Set<AppleArchitecture>();
  let objects = 0;
  const fd = fs.openSync(file, "r");

  try {
    const fileSize = fs.fstatSync(fd).size;
    const fail = (message: string): never => {
      throw new Error(`Invalid Apple archive ${file}: ${message}`);
    };
    const read = (offset: number, size: number) => {
      if (
        !Number.isSafeInteger(offset) ||
        !Number.isSafeInteger(size) ||
        offset < 0 ||
        size < 0 ||
        offset + size > fileSize
      ) {
        fail("truncated or invalid archive range");
      }
      const buffer = Buffer.allocUnsafe(size);
      if (fs.readSync(fd, buffer, 0, size, offset) !== size) {
        fail("truncated archive");
      }
      return buffer;
    };
    const architectureOf = (
      cpu: number,
      subtype: number
    ): AppleArchitecture => {
      // Capability bits are not CPU subtypes; arm64e and x86_64h remain distinct.
      const baseSubtype = subtype & 0x00ffffff;
      if (cpu === 0x0100000c && baseSubtype === 0) {
        return "arm64";
      }
      if (cpu === 0x01000007 && baseSubtype === 3) {
        return "x86_64";
      }
      return fail(
        `unsupported CPU/subtype 0x${cpu.toString(16)}/${baseSubtype}`
      );
    };

    /** A thin archive must contain one CPU, even inside a universal container. */
    const inspectArchive = (
      start: number,
      size: number,
      sliceArchitecture?: AppleArchitecture
    ) => {
      const end = start + size;
      if (size < 8 || read(start, 8).toString("ascii") !== "!<arch>\n") {
        fail("expected an ar static library");
      }
      const before = objects;
      let architecture = sliceArchitecture;
      let offset = start + 8;
      while (offset < end) {
        if (end - offset < 60) {
          fail("truncated ar member header");
        }
        const header = read(offset, 60);
        const memberSize = Number(header.toString("ascii", 48, 58).trim());
        if (
          header.toString("ascii", 58) !== "`\n" ||
          !Number.isSafeInteger(memberSize) ||
          memberSize < 0 ||
          offset + 60 + memberSize > end
        ) {
          fail("invalid ar member size or header");
        }
        let name = header.toString("ascii", 0, 16).trim();
        let payload = offset + 60;
        let payloadSize = memberSize;
        if (name.startsWith("#1/")) {
          // BSD archives store long, sometimes NUL-padded names before the object.
          const nameSize = Number(name.slice(3));
          if (
            !Number.isSafeInteger(nameSize) ||
            nameSize < 0 ||
            nameSize > memberSize
          ) {
            fail("invalid BSD member name");
          }
          name = read(payload, nameSize).toString("utf8").replace(/\0+$/, "");
          payload += nameSize;
          payloadSize -= nameSize;
        }
        offset += 60 + memberSize + (memberSize % 2);
        // BSD/GNU symbol and filename tables contain no Mach-O object.
        if (
          name.startsWith("__.SYMDEF") ||
          ["/", "//", "/SYM64/"].includes(name)
        ) {
          continue;
        }
        if (payloadSize < 32) {
          fail(`${name}: missing Mach-O header`);
        }
        const object = read(payload, 32);
        if (
          object.readUInt32LE(0) !== 0xfeedfacf ||
          object.readUInt32LE(12) !== 1
        ) {
          fail(`${name}: expected a 64-bit Mach-O object`);
        }
        const cpu = architectureOf(
          object.readUInt32LE(4),
          object.readUInt32LE(8)
        );
        if (
          !expectedArchitectures.includes(cpu) ||
          (architecture && cpu !== architecture)
        ) {
          fail(
            `${name}: unexpected ${cpu}; expected ${architecture ?? expectedArchitectures.join(" + ")}`
          );
        }
        architecture = cpu;
        const commandCount = object.readUInt32LE(16);
        const commandSize = object.readUInt32LE(20);
        if (commandSize > payloadSize - 32 || commandCount > commandSize / 8) {
          fail(`${name}: invalid Mach-O load commands`);
        }
        const commands = read(payload + 32, commandSize);
        let commandOffset = 0;
        let hasPlatform = false;
        for (let index = 0; index < commandCount; index++) {
          if (commandOffset + 8 > commands.length) {
            fail(`${name}: truncated load command`);
          }
          const command = commands.readUInt32LE(commandOffset);
          const length = commands.readUInt32LE(commandOffset + 4);
          if (length < 8 || commandOffset + length > commands.length) {
            fail(`${name}: invalid load command size`);
          }
          let platform: number | undefined;
          if (command === 0x32) {
            if (length < 24) {
              fail(`${name}: truncated LC_BUILD_VERSION`);
            }
            platform = commands.readUInt32LE(commandOffset + 8);
          } else if ([0x24, 0x25, 0x2f].includes(command)) {
            // Older assembler objects use LC_VERSION_MIN_* instead of BUILD_VERSION.
            if (length < 16) {
              fail(`${name}: truncated LC_VERSION_MIN command`);
            }
            if (command === 0x24) {
              platform = 1;
            } else if (command === 0x25) {
              platform = cpu === "x86_64" ? 7 : 2;
            } else {
              platform = cpu === "x86_64" ? 8 : 3;
            }
          }
          if (platform !== undefined) {
            hasPlatform = true;
            if (platform !== expectedPlatform.id) {
              const actual =
                Object.values(platforms).find((value) => value.id === platform)
                  ?.name ?? platform;
              fail(
                `${name} (${cpu}): expected ${expectedPlatform.name}, found ${actual}`
              );
            }
          }
          commandOffset += length;
        }
        if (!hasPlatform || commandOffset !== commands.length) {
          fail(`${name} (${cpu}): missing platform or malformed load commands`);
        }
        seen.add(cpu);
        objects++;
      }
      if (objects === before || offset !== end) {
        fail("empty or malformed archive slice");
      }
    };

    // lipo uses big-endian fat headers around independent ar archives.
    const magic = read(0, 8);
    const fatMagic = magic.readUInt32BE(0);
    if (fatMagic === 0xcafebabe || fatMagic === 0xcafebabf) {
      const count = magic.readUInt32BE(4);
      const is64 = fatMagic === 0xcafebabf;
      const entrySize = is64 ? 32 : 20;
      if (count === 0 || count > (fileSize - 8) / entrySize) {
        fail("invalid universal slice count");
      }
      const declared = new Set<AppleArchitecture>();
      for (let index = 0; index < count; index++) {
        const entry = read(8 + index * entrySize, entrySize);
        const cpu = architectureOf(
          entry.readUInt32BE(0),
          entry.readUInt32BE(4)
        );
        if (!expectedArchitectures.includes(cpu) || declared.has(cpu)) {
          fail(`unexpected or duplicate universal slice ${cpu}`);
        }
        declared.add(cpu);
        const start = is64
          ? Number(entry.readBigUInt64BE(8))
          : entry.readUInt32BE(8);
        const size = is64
          ? Number(entry.readBigUInt64BE(16))
          : entry.readUInt32BE(12);
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(size) ||
          start < 8 + count * entrySize ||
          size < 8 ||
          start + size > fileSize
        ) {
          fail(`invalid universal slice range for ${cpu}`);
        }
        inspectArchive(start, size, cpu);
      }
    } else {
      inspectArchive(0, fileSize);
    }
    if (
      seen.size !== expectedArchitectures.length ||
      expectedArchitectures.some((cpu) => !seen.has(cpu))
    ) {
      fail(
        `expected architectures ${expectedArchitectures.join(" + ")}, found ${[...seen].join(" + ")}`
      );
    }
    return { objects, architectures: [...seen] };
  } finally {
    fs.closeSync(fd);
  }
};
