import React, { useEffect, useState } from "react";

import { Fill } from "../../../renderer/components";
import {
  importSkia,
  mountCanvas,
  wait,
} from "../../../renderer/__tests__/setup";
import { processResult } from "../../../__tests__/setup";
import type { SkiaValue } from "../../types";

const counter = { value: 0 };

interface TestComputedDepsProps {
  id1: SkiaValue<number>;
  id2: SkiaValue<number>;
}

const TestComputedDeps = ({ id1, id2 }: TestComputedDepsProps) => {
  const { useComputedValue } = importSkia();
  const [dep, setDep] = useState(id1);
  const color = useComputedValue(() => {
    counter.value++;
    return dep.current % 2 ? "green" : "red";
  }, [dep]);
  useEffect(() => {
    setTimeout(() => {
      setDep(id2);
    }, 100);
  }, [id2]);
  return <Fill color={color} />;
};

interface TestComputedProps {
  id: SkiaValue<number>;
}

const TestComputed = ({ id }: TestComputedProps) => {
  const { useComputedValue } = importSkia();
  const color = useComputedValue(() => {
    return id.current % 2 ? "green" : "red";
  }, [id]);
  return <Fill color={color} />;
};

describe("useComputedValue", () => {
  it("should update as expected", async () => {
    const id = global.SkiaValueApi.createValue(0);
    const { surface, draw } = mountCanvas(<TestComputed id={id} />);
    draw();
    processResult(surface, "snapshots/animations/red.png");
    id.current = 1;
    await wait(50);
    draw();
    processResult(surface, "snapshots/animations/green.png");
  });

  it("should respect dependency changes", async () => {
    counter.value = 0;
    const id1 = global.SkiaValueApi.createValue(0);
    const id2 = global.SkiaValueApi.createValue(1);
    // We draw
    const { surface, draw } = mountCanvas(
      <TestComputedDeps id1={id1} id2={id2} />
    );
    draw();
    processResult(surface, "snapshots/animations/red.png");
    // We update the dependency
    await wait(250);
    draw();
    processResult(surface, "snapshots/animations/green.png");
    expect(counter.value).toBe(2);
  });

  it("should clean up stable version", async () => {
    counter.value = 0;
    const id1 = global.SkiaValueApi.createValue(0);
    const id2 = global.SkiaValueApi.createValue(1);
    // We draw
    const { surface, draw } = mountCanvas(
      <TestComputedDeps id1={id1} id2={id2} />
    );
    draw();
    processResult(surface, "snapshots/animations/red.png");
    // We update the dependency
    await wait(250);
    draw();
    processResult(surface, "snapshots/animations/green.png");
    expect(counter.value).toBe(2);
    // We update the values and check that only useComputedValue() is called
    id1.current++;
    id2.current++;
    draw();
    expect(counter.value).toBe(3);
  });
});
