import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Round to 3 decimal places
function round(n) {
  return Math.round(n * 1000) / 1000;
}

// Convert relative SVG path commands to absolute commands
function toAbsolute(pathData) {
  const commands = [];
  let x = 0, y = 0;  // Current position
  let startX = 0, startY = 0;  // Start of current subpath
  let lastCp2X = x, lastCp2Y = y;  // Last control point for smooth curves
  let lastCmd = '';

  // Tokenize the path data
  const tokens = pathData.match(/[a-zA-Z][^a-zA-Z]*/g) || [];

  for (const token of tokens) {
    const cmd = token[0];
    const argsStr = token.slice(1).trim();
    // Parse numbers, handling cases like ".039.744" (two decimals), "-2.3" (negative), "1.5-2.3"
    const args = [];
    if (argsStr) {
      // Match numbers including: integers, decimals, negative numbers, and decimals starting with .
      const numRegex = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
      let numMatch;
      while ((numMatch = numRegex.exec(argsStr)) !== null) {
        args.push(parseFloat(numMatch[0]));
      }
    }

    switch (cmd) {
      case 'M': // Absolute moveto
        for (let i = 0; i < args.length; i += 2) {
          x = args[i];
          y = args[i + 1];
          if (i === 0) {
            commands.push(`M${round(x)} ${round(y)}`);
            startX = x;
            startY = y;
          } else {
            commands.push(`L${round(x)} ${round(y)}`);
          }
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'M';
        break;
      case 'm': // Relative moveto
        for (let i = 0; i < args.length; i += 2) {
          x += args[i];
          y += args[i + 1];
          if (i === 0) {
            commands.push(`M${round(x)} ${round(y)}`);
            startX = x;
            startY = y;
          } else {
            commands.push(`L${round(x)} ${round(y)}`);
          }
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'M';
        break;
      case 'L': // Absolute lineto
        for (let i = 0; i < args.length; i += 2) {
          x = args[i];
          y = args[i + 1];
          commands.push(`L${round(x)} ${round(y)}`);
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'L';
        break;
      case 'l': // Relative lineto
        for (let i = 0; i < args.length; i += 2) {
          x += args[i];
          y += args[i + 1];
          commands.push(`L${round(x)} ${round(y)}`);
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'L';
        break;
      case 'H': // Absolute horizontal lineto
        for (const arg of args) {
          x = arg;
          commands.push(`L${round(x)} ${round(y)}`);
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'L';
        break;
      case 'h': // Relative horizontal lineto
        for (const arg of args) {
          x += arg;
          commands.push(`L${round(x)} ${round(y)}`);
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'L';
        break;
      case 'V': // Absolute vertical lineto
        for (const arg of args) {
          y = arg;
          commands.push(`L${round(x)} ${round(y)}`);
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'L';
        break;
      case 'v': // Relative vertical lineto
        for (const arg of args) {
          y += arg;
          commands.push(`L${round(x)} ${round(y)}`);
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'L';
        break;
      case 'C': // Absolute cubic bezier
        for (let i = 0; i < args.length; i += 6) {
          commands.push(`C${round(args[i])} ${round(args[i+1])} ${round(args[i+2])} ${round(args[i+3])} ${round(args[i+4])} ${round(args[i+5])}`);
          lastCp2X = args[i + 2];
          lastCp2Y = args[i + 3];
          x = args[i + 4];
          y = args[i + 5];
        }
        lastCmd = 'C';
        break;
      case 'c': // Relative cubic bezier
        for (let i = 0; i < args.length; i += 6) {
          const x1 = x + args[i];
          const y1 = y + args[i + 1];
          const x2 = x + args[i + 2];
          const y2 = y + args[i + 3];
          const ex = x + args[i + 4];
          const ey = y + args[i + 5];
          commands.push(`C${round(x1)} ${round(y1)} ${round(x2)} ${round(y2)} ${round(ex)} ${round(ey)}`);
          lastCp2X = x2;
          lastCp2Y = y2;
          x = ex;
          y = ey;
        }
        lastCmd = 'C';
        break;
      case 'S': // Absolute smooth cubic bezier
        for (let i = 0; i < args.length; i += 4) {
          // Reflect last control point
          let cp1X, cp1Y;
          if (lastCmd === 'C' || lastCmd === 'S') {
            cp1X = 2 * x - lastCp2X;
            cp1Y = 2 * y - lastCp2Y;
          } else {
            cp1X = x;
            cp1Y = y;
          }
          const cp2X = args[i];
          const cp2Y = args[i + 1];
          const ex = args[i + 2];
          const ey = args[i + 3];
          commands.push(`C${round(cp1X)} ${round(cp1Y)} ${round(cp2X)} ${round(cp2Y)} ${round(ex)} ${round(ey)}`);
          lastCp2X = cp2X;
          lastCp2Y = cp2Y;
          x = ex;
          y = ey;
          lastCmd = 'S';
        }
        break;
      case 's': // Relative smooth cubic bezier
        for (let i = 0; i < args.length; i += 4) {
          // Reflect last control point
          let cp1X, cp1Y;
          if (lastCmd === 'C' || lastCmd === 'S') {
            cp1X = 2 * x - lastCp2X;
            cp1Y = 2 * y - lastCp2Y;
          } else {
            cp1X = x;
            cp1Y = y;
          }
          const cp2X = x + args[i];
          const cp2Y = y + args[i + 1];
          const ex = x + args[i + 2];
          const ey = y + args[i + 3];
          commands.push(`C${round(cp1X)} ${round(cp1Y)} ${round(cp2X)} ${round(cp2Y)} ${round(ex)} ${round(ey)}`);
          lastCp2X = cp2X;
          lastCp2Y = cp2Y;
          x = ex;
          y = ey;
          lastCmd = 'S';
        }
        break;
      case 'Q': // Absolute quadratic bezier
        for (let i = 0; i < args.length; i += 4) {
          commands.push(`Q${round(args[i])} ${round(args[i+1])} ${round(args[i+2])} ${round(args[i+3])}`);
          lastCp2X = args[i];
          lastCp2Y = args[i + 1];
          x = args[i + 2];
          y = args[i + 3];
        }
        lastCmd = 'Q';
        break;
      case 'q': // Relative quadratic bezier
        for (let i = 0; i < args.length; i += 4) {
          const cpX = x + args[i];
          const cpY = y + args[i + 1];
          const ex = x + args[i + 2];
          const ey = y + args[i + 3];
          commands.push(`Q${round(cpX)} ${round(cpY)} ${round(ex)} ${round(ey)}`);
          lastCp2X = cpX;
          lastCp2Y = cpY;
          x = ex;
          y = ey;
        }
        lastCmd = 'Q';
        break;
      case 'T': // Absolute smooth quadratic bezier
        for (let i = 0; i < args.length; i += 2) {
          // Reflect last control point
          let cpX, cpY;
          if (lastCmd === 'Q' || lastCmd === 'T') {
            cpX = 2 * x - lastCp2X;
            cpY = 2 * y - lastCp2Y;
          } else {
            cpX = x;
            cpY = y;
          }
          const ex = args[i];
          const ey = args[i + 1];
          commands.push(`Q${round(cpX)} ${round(cpY)} ${round(ex)} ${round(ey)}`);
          lastCp2X = cpX;
          lastCp2Y = cpY;
          x = ex;
          y = ey;
          lastCmd = 'T';
        }
        break;
      case 't': // Relative smooth quadratic bezier
        for (let i = 0; i < args.length; i += 2) {
          // Reflect last control point
          let cpX, cpY;
          if (lastCmd === 'Q' || lastCmd === 'T') {
            cpX = 2 * x - lastCp2X;
            cpY = 2 * y - lastCp2Y;
          } else {
            cpX = x;
            cpY = y;
          }
          const ex = x + args[i];
          const ey = y + args[i + 1];
          commands.push(`Q${round(cpX)} ${round(cpY)} ${round(ex)} ${round(ey)}`);
          lastCp2X = cpX;
          lastCp2Y = cpY;
          x = ex;
          y = ey;
          lastCmd = 'T';
        }
        break;
      case 'A': // Absolute arc
        for (let i = 0; i < args.length; i += 7) {
          commands.push(`A${round(args[i])} ${round(args[i+1])} ${round(args[i+2])} ${args[i+3]} ${args[i+4]} ${round(args[i+5])} ${round(args[i+6])}`);
          x = args[i + 5];
          y = args[i + 6];
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'A';
        break;
      case 'a': // Relative arc
        for (let i = 0; i < args.length; i += 7) {
          const ex = x + args[i + 5];
          const ey = y + args[i + 6];
          commands.push(`A${round(args[i])} ${round(args[i+1])} ${round(args[i+2])} ${args[i+3]} ${args[i+4]} ${round(ex)} ${round(ey)}`);
          x = ex;
          y = ey;
        }
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'A';
        break;
      case 'Z':
      case 'z':
        commands.push('Z');
        x = startX;
        y = startY;
        lastCp2X = x;
        lastCp2Y = y;
        lastCmd = 'Z';
        break;
      default:
        console.warn(`Unknown command: ${cmd}`);
    }
  }

  return commands.join(' ');
}

const svgContent = readFileSync(join(__dirname, 'svg/Ghostscript_Tiger.svg'), 'utf-8');

// Extract all path elements with their attributes
const pathRegex = /<path\s+([^>]+)\/>/g;
const attrRegex = /(\w+(?:-\w+)?)="([^"]*)"/g;

const paths = [];
let match;

while ((match = pathRegex.exec(svgContent)) !== null) {
  const attrString = match[1];
  const attrs = {};

  let attrMatch;
  while ((attrMatch = attrRegex.exec(attrString)) !== null) {
    const [, name, value] = attrMatch;
    attrs[name] = value;
  }

  if (attrs.d) {
    const path = {
      d: toAbsolute(attrs.d),
      original: attrs.d,
    };

    if (attrs.fill && attrs.fill !== 'none') {
      path.fill = attrs.fill;
    }

    if (attrs.stroke) {
      path.stroke = attrs.stroke;
    }

    if (attrs['stroke-width']) {
      path.strokeWidth = parseFloat(attrs['stroke-width']);
    }

    paths.push(path);
  }
}

// Generate TypeScript output
const tsContent = `// Auto-generated from Ghostscript_Tiger.svg
// This file contains the path data for the Ghostscript Tiger

export interface TigerPath {
  d: string;
  original: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export const tigerPaths: TigerPath[] = ${JSON.stringify(paths, null, 2)};
`;

writeFileSync(join(__dirname, 'tigerPaths.ts'), tsContent);

console.log(`Generated ${paths.length} paths`);
