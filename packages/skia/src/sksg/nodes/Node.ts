import type { NodeType } from "../../dom/types";

export interface Node<
  Props extends Record<string, unknown> = Record<string, unknown>
> {
  type: NodeType;
  isDeclaration: boolean;
  props: Props;
  children: Node[];
}
