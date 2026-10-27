import type { ReactNode } from "react";
import React, { act } from "react";

import { importSkia, wait } from "../../renderer/__tests__/setup";
import { NodeType } from "../../dom/types";
import { SkiaSGRoot } from "../Reconciler";

const ProbeContext = React.createContext(0);
const noop = () => {};
const readZero = () => 0;
const keepState = (state: number) => state;
const subscribe = () => noop;

// One call per hook React exports: a hook missing here fails "runs every hook
// React exports inside a Canvas".
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

const boom = new Error("boom");

const renderInCanvas = async (element: ReactNode) => {
  const { Skia } = importSkia();
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});
  try {
    const root = new SkiaSGRoot(Skia);
    await root.render(element);
    // The reconciler reports some errors from a task it queues after the commit.
    await wait(0);
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

describe("SkiaSGRoot", () => {
  it("records the scene on every render, the same element included", async () => {
    const { Skia } = importSkia();
    const root = new SkiaSGRoot(Skia);
    const { container } = root as unknown as {
      container: { redraw: () => void };
    };
    const redraw = jest.spyOn(container, "redraw");
    const element = <skCircle c={{ x: 10, y: 10 }} r={5} color="red" />;
    await root.render(element);
    expect(redraw).toHaveBeenCalledTimes(1);
    // React bails out on the element it already rendered; that commit changes
    // nothing, and the render callback records the scene, so a shared value
    // changed since the last render is picked up.
    await root.render(element);
    expect(redraw).toHaveBeenCalledTimes(2);
    await root.unmount();
  });

  it("keeps the committed scene while a transition that suspends is pending", async () => {
    const { Skia } = importSkia();
    const pending = new Promise<never>(() => {});
    let suspensions = 0;
    let reveal: (show: boolean) => void = () => {};
    const Suspends = (): ReactNode => {
      suspensions++;
      throw pending;
    };
    const Scene = () => {
      const [show, setShow] = React.useState(false);
      reveal = setShow;
      return (
        <React.Suspense fallback={<skRect x={0} y={0} width={1} height={1} />}>
          {show ? <Suspends /> : <skCircle r={1} />}
        </React.Suspense>
      );
    };
    const root = new SkiaSGRoot(Skia);
    const scene = () => root.sg.children.map(({ type }) => type);
    const element = <Scene />;
    await root.render(element);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    await act(() => {
      React.startTransition(() => reveal(true));
    });
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    // React rendered the transition up to the root and committed nothing.
    expect(suspensions).toBeGreaterThan(0);
    expect(scene()).toEqual([NodeType.Circle]);
    await root.render(element);
    expect(scene()).toEqual([NodeType.Circle]);
    await root.unmount();
  });

  it("reports an error caught by a boundary", async () => {
    const { Skia } = importSkia();
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const root = new SkiaSGRoot(Skia);
    const Throws = () => {
      throw new Error("boom");
    };
    class Boundary extends React.Component<
      { children: React.ReactNode },
      { failed: boolean }
    > {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      render() {
        return this.state.failed ? (
          <skCircle c={{ x: 10, y: 10 }} r={5} color="red" />
        ) : (
          this.props.children
        );
      }
    }
    await root.render(
      <Boundary>
        <Throws />
      </Boundary>
    );
    // The reconciler reports a caught error from a timer.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
      expect.anything()
    );
    error.mockRestore();
    await root.unmount();
  });
});
