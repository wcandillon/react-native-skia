import React from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { SkiaSGRoot } from "../Reconciler";

// What a reconciler hooks itself into when it is built: it wraps
// onStartTransitionFinish (S) around the one already there.
const internals = (
  React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
      S: unknown;
    };
  }
).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

// In its own file: the reconciler is built once per module registry, so no
// other test may render before this one.
describe("Reconciler creation", () => {
  it("leaves React untouched until the first render", async () => {
    const { Skia, Group } = importSkia();
    const atImport = internals.S;

    // What a server render of a Canvas does: construct the root, never
    // render into it.
    const idle = new SkiaSGRoot(Skia);
    expect(internals.S).toBe(atImport);
    expect(await idle.unmount()).toBe(true);
    expect(internals.S).toBe(atImport);

    const root = new SkiaSGRoot(Skia);
    await root.render(<Group />);
    const installed = internals.S;
    expect(installed).not.toBe(atImport);
    expect(root.sg.children).toHaveLength(1);

    // One reconciler for every root.
    const other = new SkiaSGRoot(Skia);
    await other.render(<Group />);
    await idle.render(<Group />);
    expect(internals.S).toBe(installed);
    expect(idle.sg.children).toHaveLength(1);

    await Promise.all([root.unmount(), other.unmount(), idle.unmount()]);
    expect(internals.S).toBe(installed);
  });
});
