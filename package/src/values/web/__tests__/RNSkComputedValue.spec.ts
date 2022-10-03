import { RNSkComputedValue } from "../RNSkComputedValue";
import { RNSkValue } from "../RNSkValue";

describe("RNSkComputedValue", () => {
  it("should update when dependency changes", () => {
    const dependency = new RNSkValue(10);
    const computed = new RNSkComputedValue(
      () => 10 * dependency.current,
      [dependency]
    );
    expect(computed.current).toBe(100);
    dependency.current = 20;
    expect(computed.current).toBe(200);
  });

  it("should support invalidation of previous subscriptions when depencency changes", () => {
    const dependency = new RNSkValue(10);
    const changeFlag = { changed: 0 };
    const updateFunc = () => {
      changeFlag.changed++;
      return dependency.current;
    };

    const computed = new RNSkComputedValue(updateFunc, [dependency]);

    // Validate initial values
    expect(changeFlag.changed).toBe(1);
    expect(computed.current).toBe(10);

    // Now let's show that the change flag is set to true when the dependency changes
    dependency.current = 20;
    expect(changeFlag.changed).toBe(2);

    // Now let's create a new computed value (which is what the useComputedValue hook does)
    const nextComputed = new RNSkComputedValue(updateFunc, [dependency]);

    // Now let's show that updating the computed value calls the change flag twice
    dependency.current = 30;
    expect(nextComputed.current).toBe(30);
    expect(changeFlag.changed).toBe(5);

    // Now invalidate both values
    computed.__invalidate();
    nextComputed.__invalidate();

    // Change current and verify that changeFlag is same as above
    dependency.current = 40;
    expect(changeFlag.changed).toBe(5);
  });
});
