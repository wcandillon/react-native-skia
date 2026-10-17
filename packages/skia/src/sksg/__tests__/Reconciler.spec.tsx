import type { ReactNode } from "react";
import React from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { NodeType } from "../../dom/types";
import { SkiaSGRoot } from "../Reconciler";

const ProbeContext = React.createContext(0);
const noop = () => {};
const readZero = () => 0;
const keepState = (state: number) => state;
const subscribe = () => noop;

// One call per hook React exports: a hook missing here fails the first test.
const hookCalls: Record<string, () => unknown> = {
  use: () => React.use(ProbeContext),
  useActionState: () => React.useActionState(keepState, 0),
  useCallback: () => React.useCallback(readZero, []),
  useContext: () => React.useContext(ProbeContext),
  useDebugValue: () => React.useDebugValue(0),
  useDeferredValue: () => React.useDeferredValue(0),
  useEffect: () => React.useEffect(noop, []),
  useEffectEvent: () => {
    React.useEffectEvent(noop);
  },
  useId: () => React.useId(),
  useImperativeHandle: () => React.useImperativeHandle(null, () => ({})),
  useInsertionEffect: () => React.useInsertionEffect(noop, []),
  useLayoutEffect: () => React.useLayoutEffect(noop, []),
  useMemo: () => React.useMemo(readZero, []),
  useOptimistic: () => React.useOptimistic(0),
  useReducer: () => React.useReducer(keepState, 0),
  useRef: () => React.useRef(0),
  useState: () => React.useState(0),
  useSyncExternalStore: () =>
    React.useSyncExternalStore(subscribe, readZero, readZero),
  useTransition: () => React.useTransition(),
};

interface HookProbeProps {
  call: () => unknown;
  onCommit: () => void;
}

const HookProbe = ({ call, onCommit }: HookProbeProps) => {
  call();
  React.useLayoutEffect(onCommit, [onCommit]);
  return null;
};

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

class Boundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const boom = new Error("boom");

const Thrower = (): ReactNode => {
  throw boom;
};

// The reconciler reports some errors from a task it queues after the commit.
const flushQueuedTasks = () => new Promise((resolve) => setTimeout(resolve, 0));

const renderInCanvas = async (element: ReactNode) => {
  const { Skia } = importSkia();
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});
  try {
    const root = new SkiaSGRoot(Skia);
    await root.render(element);
    await flushQueuedTasks();
    const drawn = root.sg.children.map(({ type }) => type);
    await root.unmount();
    return { drawn, logged: consoleError.mock.calls };
  } finally {
    consoleError.mockRestore();
  }
};

describe("Reconciler", () => {
  it("runs every hook React exports inside a Canvas", async () => {
    const hooks = Object.keys(React).filter((name) =>
      /^use([A-Z]|$)/.test(name)
    );
    expect(hooks.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const name of hooks) {
      const call = hookCalls[name];
      if (call === undefined) {
        failures.push(`${name}: no call in hookCalls`);
        continue;
      }
      let committed = false;
      const { logged } = await renderInCanvas(
        <HookProbe
          call={call}
          onCommit={() => {
            committed = true;
          }}
        />
      );
      if (!committed || logged.length > 0) {
        failures.push(
          `${name}: ${logged.map((args) => String(args[0])).join("; ")}`
        );
      }
    }
    expect(failures).toEqual([]);
  });

  it("reports an error a boundary inside a Canvas catches", async () => {
    const { drawn, logged } = await renderInCanvas(
      <Boundary fallback={<skCircle r={1} />}>
        <Thrower />
      </Boundary>
    );
    expect(drawn).toEqual([NodeType.Circle]);
    expect(logged.some((args) => args.includes(boom))).toBe(true);
  });

  it("names the environment a caught error was raised in", async () => {
    const serverError = Object.assign(new Error("boom"), {
      environmentName: "Server",
    });
    const ServerThrower = (): ReactNode => {
      throw serverError;
    };
    const { logged } = await renderInCanvas(
      <Boundary fallback={null}>
        <ServerThrower />
      </Boundary>
    );
    expect(
      logged.some(
        ([format, badge, error]) =>
          String(format).startsWith("[%s] ") &&
          badge === " Server " &&
          error === serverError
      )
    ).toBe(true);
  });

  it("reports an error React recovers from by rendering again", async () => {
    let thrown = false;
    const ThrowsOnce = () => {
      if (!thrown) {
        thrown = true;
        throw boom;
      }
      return <skCircle r={1} />;
    };
    const { drawn, logged } = await renderInCanvas(<ThrowsOnce />);
    expect(drawn).toEqual([NodeType.Circle]);
    expect(
      logged.some(([error]) => error instanceof Error && error.cause === boom)
    ).toBe(true);
  });
});
