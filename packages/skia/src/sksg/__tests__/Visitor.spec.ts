import { NodeType } from "../../dom/types";
import type { Node } from "../Node";
import type { Command } from "../Recorder/Core";
import { CommandType, isGroup } from "../Recorder/Core";
import { Recorder } from "../Recorder/Recorder";
import { visit } from "../Recorder/Visitor";

const node = (
  type: NodeType,
  props: object = {},
  children: Node[] = []
): Node => ({ type, props, children });

// The commands in recording order, without the groups.
const flatten = (commands: Command[]): Command[] =>
  commands.flatMap((command) =>
    isGroup(command) ? flatten(command.children) : [command]
  );

describe("visit", () => {
  it("records a <Blend> of shaders as the input of an image filter", () => {
    const recorder = new Recorder();
    visit(recorder, [
      node(NodeType.Rect, { x: 0, y: 0, width: 10, height: 10 }, [
        node(
          NodeType.DisplacementMapImageFilter,
          { channelX: "r", channelY: "g", scale: 1 },
          [
            node(NodeType.Blend, { mode: "multiply" }, [
              node(NodeType.Turbulence, { freqX: 1, freqY: 1, octaves: 1 }),
              node(NodeType.FractalNoise, { freqX: 1, freqY: 1, octaves: 1 }),
            ]),
          ]
        ),
      ]),
    ]);
    const commands = flatten(recorder.commands);
    const declarations = commands
      .filter(
        (command) =>
          command.type === CommandType.PushShader ||
          command.type === CommandType.PushImageFilter
      )
      .map((command) => command.shaderType ?? command.imageFilterType);
    // The blend comes after the shaders it blends, the filter after its input.
    expect(declarations).toEqual([
      NodeType.Turbulence,
      NodeType.FractalNoise,
      NodeType.Blend,
      NodeType.DisplacementMapImageFilter,
    ]);
    const blend = commands.find(
      (command) =>
        command.type === CommandType.PushShader &&
        command.shaderType === NodeType.Blend
    );
    expect(blend?.children).toBe(2);
    // A shader does not compose with its children: only the image filter
    // composes with its input.
    expect(
      commands.filter(
        (command) => command.type === CommandType.ComposeImageFilter
      )
    ).toHaveLength(1);
  });
});
