import type { SkSLCompilationMessage } from "../types/Errors";

/**
 * The diagnostics of SkSL error text, read like the native implementation
 * does (cpp/utils/SkSLErrorText.h): one per "error: 12: message" line, each
 * followed by the source line and a line of carets under the culprit, which
 * gives the position. The "1 error" summary line is left out.
 */
export const parseSkSLErrorText = (
  errorText: string
): SkSLCompilationMessage[] => {
  const messages: {
    type: "error" | "warning";
    message: string;
    lineNum: number;
    linePos: number;
  }[] = [];
  let echoed = false;
  let truncated = false;
  for (const line of errorText.split("\n")) {
    const match = /^(error|warning): (?:(\d+): )?(.*)$/.exec(line);
    if (match) {
      messages.push({
        type: match[1] as "error" | "warning",
        lineNum: match[2] !== undefined ? parseInt(match[2], 10) : 0,
        linePos: 0,
        message: match[3],
      });
      echoed = false;
      continue;
    }
    if (messages.length === 0) {
      continue;
    }
    if (!echoed) {
      echoed = true;
      truncated = line.startsWith("...");
      continue;
    }
    const last = messages[messages.length - 1];
    if (/^[ .^]*\^[ .^]*$/.test(line) && !truncated && last.linePos === 0) {
      last.linePos = line.indexOf("^") + 1;
    }
  }
  if (messages.length === 0 && errorText.length > 0) {
    messages.push({
      type: "error",
      message: errorText,
      lineNum: 0,
      linePos: 0,
    });
  }
  return messages;
};

/** The message of an SkSLCompilationError, as native code words it. */
export const describeSkSLErrors = (messages: SkSLCompilationMessage[]) =>
  "SkSL compilation failed:\n" +
  messages
    .map((m) => (m.lineNum > 0 ? `${m.lineNum}: ${m.message}` : m.message))
    .join("\n");
