import { itRunsE2eOnly } from "../../../__tests__/setup";
import { readScreenColor, surface } from "../setup";

describe("SkiaGraphiteView", () => {
  itRunsE2eOnly(
    "fills its box with the frame it records once mounted",
    async () => {
      const image = await surface.screen("GraphiteView");
      expect({
        topLeft: readScreenColor(image, 1 / 4),
        bottomRight: readScreenColor(image, 3 / 4),
      }).toEqual({ topLeft: "cyan", bottomRight: "cyan" });
    }
  );

  itRunsE2eOnly(
    "records that frame at its layout size under a scale transform",
    async () => {
      const image = await surface.screen("GraphiteViewTransform");
      // Scaled to the middle half of the screen: 3/8 is in its top-left
      // quarter and 5/8 in its bottom-right one.
      expect({
        topLeft: readScreenColor(image, 3 / 8),
        bottomRight: readScreenColor(image, 5 / 8),
      }).toEqual({ topLeft: "cyan", bottomRight: "cyan" });
    }
  );

  // A canvas waits for its size before it records; JS, which asks for the
  // recording itself, is told why it cannot have one yet.
  itRunsE2eOnly(
    "tells JS that a view without a size cannot record",
    async () => {
      const outcome = await surface.eval(() => {
        // An id no view takes: theirs count up from 1000, one per mount.
        const nativeId = 2 ** 31;
        const { SkiaViewApi } = globalThis;
        const context = SkiaViewApi.makeGraphiteContext(
          nativeId,
          0,
          0,
          false,
          false
        );
        try {
          context.beginRecording();
          context.finishRecording();
          return "recorded";
        } catch (e) {
          return (e as Error).message;
        } finally {
          SkiaViewApi.destroyGraphiteContext(nativeId);
        }
      });
      expect(outcome).toContain("SkiaGraphiteView: the view has no size yet.");
    }
  );

  // StrictMode runs the view's unmount cleanup once right after mount and
  // keeps the context the first effect run made. A native view registering
  // after that cleanup binds the target that context holds, not a new one:
  // the registry keeps a retired target for as long as a context holds it.
  // A second context made for the id stands in for the view's bind here. One
  // recording is open at a time per target, so the second beginRecording()
  // throws only when both contexts share the target.
  itRunsE2eOnly(
    "keeps the target of a retired context for the view to bind",
    async () => {
      const shared = await surface.eval(() => {
        // An id no view takes: theirs count up from 1000, one per mount.
        const nativeId = 2 ** 31;
        // Hermes evaluates the code at the top level, where Metro's `global`
        // module parameter is out of scope.
        const { SkiaViewApi } = globalThis;
        const kept = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        kept.beginRecording();
        SkiaViewApi.destroyGraphiteContext(nativeId);
        const next = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        let outcome = "opened its own recording";
        try {
          next.beginRecording();
          next.finishRecording();
        } catch (e) {
          outcome = (e as Error).message.includes("already open")
            ? "shares the open recording"
            : `threw: ${(e as Error).message}`;
        }
        kept.finishRecording();
        SkiaViewApi.destroyGraphiteContext(nativeId);
        return outcome;
      });
      expect(shared).toBe("shares the open recording");
    }
  );

  // Every context made for a view records the view's one recording, so
  // whichever context finishes it ends the canvas another one began it with.
  itRunsE2eOnly(
    "throws when drawing on the canvas of a recording another context finished",
    async () => {
      const outcome = await surface.eval((Skia) => {
        // An id no view and no other case takes: theirs count up from 1000.
        const nativeId = 2 ** 31 + 1;
        const { SkiaViewApi } = globalThis;
        const beginning = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        const finishing = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        const canvas = beginning.beginRecording();
        finishing.finishRecording().dispose();
        try {
          canvas.drawColor(Skia.Color("cyan"));
          return "drew";
        } catch (error) {
          return (error as Error).message;
        } finally {
          beginning.dispose();
          finishing.dispose();
          SkiaViewApi.destroyGraphiteContext(nativeId);
        }
      });
      expect(outcome).toContain("recording has finished");
    }
  );

  // The context and the registry are the only holders of the target of an id
  // no view binds: once the context is disposed and the id retired, the target
  // goes, and its recorder frees the deferred canvas of the open recording.
  itRunsE2eOnly(
    "throws when drawing on the canvas of a recording whose target is gone",
    async () => {
      const outcome = await surface.eval((Skia) => {
        // An id no view and no other case takes: theirs count up from 1000.
        const nativeId = 2 ** 31 + 2;
        const { SkiaViewApi } = globalThis;
        const context = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        const canvas = context.beginRecording();
        context.dispose();
        SkiaViewApi.destroyGraphiteContext(nativeId);
        try {
          canvas.drawColor(Skia.Color("cyan"));
          return "drew";
        } catch (error) {
          return (error as Error).message;
        }
      });
      expect(outcome).toContain("recording has finished");
    }
  );

  // The view owns its recording state, whether or not JS keeps the context it
  // began the recording on. Until JS retires an id no view binds, the registry
  // keeps its target, as it keeps a mounted view's.
  itRunsE2eOnly(
    "keeps the recording open when the context that began it is disposed",
    async () => {
      const outcome = await surface.eval((Skia) => {
        // An id no view and no other case takes: theirs count up from 1000.
        const nativeId = 2 ** 31 + 3;
        const { SkiaViewApi } = globalThis;
        const beginning = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        const canvas = beginning.beginRecording();
        beginning.dispose();
        const finishing = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        try {
          canvas.drawColor(Skia.Color("cyan"));
          finishing.finishRecording().dispose();
          return "finished";
        } catch (error) {
          return (error as Error).message;
        } finally {
          finishing.dispose();
          SkiaViewApi.destroyGraphiteContext(nativeId);
        }
      });
      expect(outcome).toBe("finished");
    }
  );
});
