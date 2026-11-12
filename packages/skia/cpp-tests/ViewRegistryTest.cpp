// Host-side check of RNSkia::RNSkViewRegistry, which keeps the properties JS
// set for a native view id and the view registered for it (see run.sh). An
// entry lives while the JS component of the id is mounted or a native view
// is registered for it; the properties are delivered to every view that
// registers for the id while it does.

#include <cstddef>
#include <cstdio>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include "rnskia/RNSkViewRegistry.h"

namespace {

// A view that remembers what it was given.
struct View {
  std::unordered_map<std::string, int> props;
  int deliveries = 0;
};

using Registry = RNSkia::RNSkViewRegistry<View, int>;
using Props = std::unordered_map<std::string, int>;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

Registry &registry() { return Registry::getInstance(); }

void set(size_t id, const std::string &name, int value) {
  registry().setProperty(
      id, name, value,
      [](const std::shared_ptr<View> &view, const std::string &n, int v) {
        view->props[n] = v;
        view->deliveries++;
      });
}

void attach(size_t id, const std::shared_ptr<View> &view) {
  registry().registerView(
      id, view, [](const std::shared_ptr<View> &v, Props &props) {
        for (const auto &prop : props) {
          v->props[prop.first] = prop.second;
        }
        v->deliveries++;
      });
}

bool has(size_t id) {
  bool found = false;
  registry().withExistingInfo(id, [&](Registry::Info &) { found = true; });
  return found;
}

// The reported bug: Fabric tears the native view down under a mounted canvas
// and creates another one for the same id.
void testNextViewGetsTheProperties() {
  registry().clear();
  auto id = registry().allocateId();
  set(id, "deviceIndependentFonts", 1);
  set(id, "recorder", 42);
  auto first = std::make_shared<View>();
  attach(id, first);
  expect(first->props["recorder"] == 42, "the first view gets the recorder");
  expect(registry().unregisterView(id, first.get()),
         "the view unregisters itself");
  expect(has(id), "a mounted component keeps the entry without a view");
  expect(registry().getView(id) == nullptr, "the torn down view is let go of");
  auto second = std::make_shared<View>();
  attach(id, second);
  expect(second->props["recorder"] == 42, "the next view gets the recorder");
  expect(second->props["deviceIndependentFonts"] == 1,
         "the next view gets the options");
  registry().release(id);
  expect(has(id), "a registered view keeps the entry after the unmount");
  expect(registry().unregisterView(id, second.get()), "the last view is gone");
  expect(!has(id), "the entry goes with its last owner");
  expect(registry().size() == 0, "nothing is left");
}

// A property set while a view is registered reaches it alone, and a view
// that registers again (it does on every props update) gets nothing twice.
void testDeliveries() {
  registry().clear();
  auto id = registry().allocateId();
  auto view = std::make_shared<View>();
  attach(id, view);
  expect(view->deliveries == 1, "a new view gets the (empty) properties");
  set(id, "recorder", 1);
  expect(view->deliveries == 2 && view->props["recorder"] == 1,
         "a property reaches the registered view");
  attach(id, view);
  expect(view->deliveries == 2, "registering again delivers nothing");
  registry().clear();
}

// The content is a recorder or a picture: a view registering later must not
// get the one that was replaced.
void testContentIsExclusive() {
  registry().clear();
  auto id = registry().allocateId();
  set(id, "picture", 1);
  set(id, "recorder", 2);
  auto view = std::make_shared<View>();
  attach(id, view);
  expect(view->props.count("picture") == 0, "the replaced picture is gone");
  expect(view->props["recorder"] == 2, "the recorder is the content");
  set(id, "picture", 3);
  auto next = std::make_shared<View>();
  registry().unregisterView(id, view.get());
  attach(id, next);
  expect(next->props.count("recorder") == 0, "the replaced recorder is gone");
  expect(next->props["picture"] == 3, "the picture is the content");
  registry().clear();
}

// A view torn down after its replacement registered must not detach it.
void testLateTeardown() {
  registry().clear();
  auto id = registry().allocateId();
  set(id, "recorder", 1);
  auto first = std::make_shared<View>();
  auto second = std::make_shared<View>();
  attach(id, first);
  attach(id, second);
  expect(second->props["recorder"] == 1, "the replacement gets the recorder");
  expect(!registry().unregisterView(id, first.get()),
         "the replaced view does not unregister the id");
  expect(registry().getView(id) == second, "the replacement stays");
  expect(registry().unregisterView(id, nullptr) == false,
         "a caller without a view does not unregister another one's");
  registry().clear();
}

// StrictMode and a hidden Activity unmount the component and mount it again
// with the same id, with or without a native view at that point.
void testSimulatedUnmount() {
  registry().clear();
  auto id = registry().allocateId();
  // Before the native view registered.
  set(id, "deviceIndependentFonts", 1);
  set(id, "recorder", 1);
  registry().release(id);
  expect(!has(id), "the unmount lets go of the properties");
  set(id, "deviceIndependentFonts", 1);
  set(id, "recorder", 2);
  auto view = std::make_shared<View>();
  attach(id, view);
  expect(view->props["deviceIndependentFonts"] == 1,
         "the options set again reach the view");
  expect(view->props["recorder"] == 2, "the new recording reaches the view");
  // With the native view registered.
  registry().release(id);
  expect(has(id), "the view keeps the entry");
  set(id, "recorder", 3);
  expect(view->props["recorder"] == 3, "the view gets the next recording");
  registry().unregisterView(id, view.get());
  expect(has(id), "mounted again, the component keeps the entry");
  registry().release(id);
  expect(!has(id), "and lets go of it for good");
}

// The native view outlives its component (an exit animation), or never
// comes; a view whose component set nothing leaves nothing behind either.
void testNoEntryIsLeftBehind() {
  registry().clear();
  auto id = registry().allocateId();
  set(id, "recorder", 1);
  registry().release(id);
  expect(registry().size() == 0, "a component without a view leaves nothing");
  registry().release(id);
  expect(registry().unregisterView(id, nullptr), "unknown ids are fine");
  auto view = std::make_shared<View>();
  attach(id, view);
  registry().unregisterView(id, view.get());
  expect(registry().size() == 0, "a view without a component leaves nothing");
  auto other = registry().allocateId();
  expect(other != id, "ids are not handed out twice");
}

} // namespace

int main() {
  testNextViewGetsTheProperties();
  testDeliveries();
  testContentIsExclusive();
  testLateTeardown();
  testSimulatedUnmount();
  testNoEntryIsLeftBehind();
  if (failures > 0) {
    std::fprintf(stderr, "%d failure(s)\n", failures);
    return 1;
  }
  std::printf("ViewRegistryTest: passed\n");
  return 0;
}
