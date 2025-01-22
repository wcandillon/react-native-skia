import type { Command } from "./Recorder/Core";

export const printRecording = (recording: Command[]) => {
  "worklet";
  console.log(JSON.stringify(recording, null, 2));
};
