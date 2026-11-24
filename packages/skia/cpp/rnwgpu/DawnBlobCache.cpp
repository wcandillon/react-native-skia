#include "DawnBlobCache.h"

#include <dirent.h>
#include <sys/stat.h>
#include <unistd.h>

#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <deque>
#include <functional>
#include <mutex>
#include <string>
#include <system_error>
#include <thread>
#include <utility>
#include <vector>

namespace rnwgpu {

namespace {

// Entries only accumulate as an app's shaders change from release to release.
// A cache found past this size when it is set up is cleared, and a session
// whose stores would take it past this size drops them until the next setup.
constexpr off_t kMaxCacheBytes = 64 * 1024 * 1024;

// An entry this large is not stored, so that one entry cannot take more than
// half the cache from all the others. The entry already on disk under its key,
// if any, is left as it is, and a blob that has outgrown this stops being
// updated.
constexpr off_t kMaxEntryBytes = kMaxCacheBytes / 2;

// A temporary file this old is taken for a write that will never finish (its
// process was killed). A younger one may still be being written by another
// process using the same cache, so it is left. A writer suspended for longer
// than this loses its entry (its rename fails), which only costs a cache miss.
constexpr time_t kAbandonedWriteSeconds = 60;

// Before a store is dropped for taking the cache past its limit, the
// directory is measured again, in case the entries counted so far are gone.
// Not before every one, though: a session at its limit may be refused a store
// per shader it compiles, and a measure reads every entry. The directory is
// measured again when its modification time changed since the last measure
// (an entry written to it or removed from it, by anyone, changes it) and, as
// that time can be coarse, when the last measure is this old.
constexpr std::chrono::seconds kMeasureAgainAfter{10};

// Never destroyed: a store can still be queued when the process starts to
// exit.
std::mutex &directoryMutex() {
  static std::mutex *const mutex = new std::mutex;
  return *mutex;
}

std::string &directorySlot() {
  static std::string *const directory = new std::string;
  return *directory;
}

std::string directory() {
  std::lock_guard<std::mutex> lock(directoryMutex());
  return directorySlot();
}

// Stores refused on this thread because the entry was too large. Dawn stores
// on the thread that has it write (see refusedStoresOnThisThread()).
thread_local uint64_t refusedStores = 0;

// Everything that changes the directory runs here, one job after another: the
// tidying of setDirectory() and the stores. Dawn stores from the thread that
// compiles, a JS thread included, and holds the device's lock while it stores
// its pipeline cache, so none of them should wait for the disk. Never
// destroyed, so a job queued as the process exits never runs into a destroyed
// queue; a write cut short by the exit leaves a temporary file the next setup
// removes.
class Writer {
public:
  static Writer &shared() {
    static Writer *const writer = new Writer;
    return *writer;
  }

  // Queues `job` for the thread. Without a thread to be had (a process at its
  // limit) the jobs queued so far are dropped, not run here: a store run on
  // Dawn's thread would keep it waiting for the disk, and two run at once
  // would write the same temporary file. The next post tries for a thread
  // again, and the first store to run tidies the directory in place of the
  // tidying dropped (see writeEntry).
  void post(std::function<void()> job) {
    std::lock_guard<std::mutex> lock(_mutex);
    _queue.push_back(std::move(job));
    if (!_started) {
      try {
        std::thread([this] { run(); }).detach();
        _started = true;
      } catch (const std::system_error &) {
        _queue.clear();
        return;
      }
    }
    _wake.notify_one();
  }

  // Blocks until every job posted so far has run.
  void wait() {
    std::unique_lock<std::mutex> lock(_mutex);
    _idle.wait(lock, [this] { return _queue.empty() && !_busy; });
  }

  // The directory last tidied, and the bytes of the entries in it: what the
  // tidying found, plus what this session stored since. Read and written by
  // jobs only.
  std::string tidied;
  off_t total = 0;

  // When the directory was last measured: its modification time then, and the
  // time (see kMeasureAgainAfter). Read and written by jobs only.
  timespec measuredModification{};
  std::chrono::steady_clock::time_point measuredAt{};

private:
  void run() {
    std::unique_lock<std::mutex> lock(_mutex);
    for (;;) {
      _wake.wait(lock, [this] { return !_queue.empty(); });
      std::function<void()> job = std::move(_queue.front());
      _queue.pop_front();
      _busy = true;
      lock.unlock();
      try {
        job();
      } catch (...) {
        // Out of memory, most likely. The cache is best effort, and a write
        // cut short leaves a temporary file the next setup removes; on a
        // detached thread the exception would end the process instead.
      }
      // Frees the job's copy of the blob before the queue is locked again.
      job = nullptr;
      lock.lock();
      _busy = false;
      if (_queue.empty()) {
        _idle.notify_all();
      }
    }
  }

  std::mutex _mutex;
  std::condition_variable _wake;
  std::condition_variable _idle;
  std::deque<std::function<void()>> _queue;
  bool _started = false;
  bool _busy = false;
};

// Creates `dir` and any of its parents that are missing.
void makeDirectories(const std::string &dir) {
  for (size_t slash = dir.find('/', 1); slash != std::string::npos;
       slash = dir.find('/', slash + 1)) {
    mkdir(dir.substr(0, slash).c_str(), 0700);
  }
  mkdir(dir.c_str(), 0700);
}

// One file per entry, named by a 64-bit FNV-1a hash of its key.
std::string entryPath(const std::string &dir, size_t keySize,
                      const uint8_t *key) {
  uint64_t hash = 14695981039346656037ull;
  for (size_t i = 0; i < keySize; ++i) {
    hash ^= key[i];
    hash *= 1099511628211ull;
  }
  char name[18];
  snprintf(name, sizeof(name), "/%016llx",
           static_cast<unsigned long long>(hash));
  return dir + name;
}

off_t entryBytes(size_t keySize, size_t valueSize) {
  return static_cast<off_t>(2 * sizeof(uint64_t) + keySize + valueSize);
}

timespec modificationTime(const struct stat &info) {
#ifdef __APPLE__
  return info.st_mtimespec;
#else
  return info.st_mtim;
#endif
}

// What measure() found in the directory.
struct Contents {
  std::vector<std::string> entries;
  off_t bytes = 0;
};

Contents measure(const std::string &dir);
void tidy(const std::string &dir);

// Whether the directory may hold other entries than the last measure found:
// it was changed since, or is gone, or the measure is old enough for its
// modification time to be the same as then although it was changed (see
// kMeasureAgainAfter). Runs on the writer.
bool changedSinceMeasured(const std::string &dir) {
  const Writer &writer = Writer::shared();
  if (std::chrono::steady_clock::now() - writer.measuredAt >
      kMeasureAgainAfter) {
    return true;
  }
  struct stat info{};
  if (stat(dir.c_str(), &info) != 0) {
    return true;
  }
  const timespec modified = modificationTime(info);
  return modified.tv_sec != writer.measuredModification.tv_sec ||
         modified.tv_nsec != writer.measuredModification.tv_nsec;
}

// An entry is the key's size, the value's size, the key and the value. The
// stored key is compared on load, so a hash collision reads as a miss, and so
// does an entry shorter than its recorded size. Dawn asks for the size first
// (no buffer), then for the value.
size_t loadEntry(size_t keySize, const uint8_t *key, size_t valueSize,
                 uint8_t *value, void * /* userdata1 */,
                 void * /* userdata2 */) {
  const std::string dir = directory();
  if (dir.empty()) {
    return 0;
  }
  FILE *file = fopen(entryPath(dir, keySize, key).c_str(), "rb");
  if (file == nullptr) {
    return 0;
  }
  size_t result = 0;
  uint64_t sizes[2] = {0, 0};
  if (fread(sizes, sizeof(sizes), 1, file) == 1 && sizes[0] == keySize) {
    std::vector<uint8_t> storedKey(keySize);
    if (fread(storedKey.data(), 1, keySize, file) == keySize &&
        memcmp(storedKey.data(), key, keySize) == 0) {
      const long start = ftell(file);
      fseek(file, 0, SEEK_END);
      const size_t stored = static_cast<size_t>(ftell(file) - start);
      if (stored == sizes[1]) {
        if (value == nullptr || valueSize == 0) {
          result = stored;
        } else if (valueSize >= stored) {
          fseek(file, start, SEEK_SET);
          result = fread(value, 1, stored, file) == stored ? stored : 0;
        }
      }
    }
  }
  fclose(file);
  return result;
}

// Written aside and renamed into place, so a load on another thread never
// sees half an entry. Runs on the writer.
void writeEntry(const std::string &dir, const std::vector<uint8_t> &key,
                const std::vector<uint8_t> &value) {
  Writer &writer = Writer::shared();
  // The tidying of setDirectory() has not run for this directory: it was
  // dropped for want of a thread then, or this store was queued ahead of it,
  // or the store is bound for a directory set before the current one. Done
  // now, so that the store is counted against its own directory.
  if (writer.tidied != dir) {
    tidy(dir);
  }
  const std::string path = entryPath(dir, key.size(), key.data());
  const off_t bytes = entryBytes(key.size(), value.size());
  struct stat replaced{};
  const off_t previousBytes =
      stat(path.c_str(), &replaced) == 0 ? replaced.st_size : 0;
  if (previousBytes == 0) {
    // A new entry, unless the system or the app cleared the cache directory,
    // or its parent, during the session: then it has to be made again.
    struct stat info{};
    if (stat(dir.c_str(), &info) != 0) {
      makeDirectories(dir);
    }
  }
  // Past the limit the cache stops growing until the next setup clears it.
  // Replacing an entry with one no larger is not growth: Dawn's monolithic
  // pipeline cache is one entry stored over and over. Before a store is
  // dropped the directory is measured again, if it may have changed, since
  // the entries counted so far may be gone: the system clears app caches as
  // it needs the space (iOS removes the files, not always the directory), and
  // so may the app.
  const off_t growth = bytes > previousBytes ? bytes - previousBytes : 0;
  if (growth > 0 && writer.total + growth > kMaxCacheBytes) {
    if (changedSinceMeasured(dir)) {
      writer.total = measure(dir).bytes;
    }
    if (writer.total + growth > kMaxCacheBytes) {
      return;
    }
  }
  const std::string temporary = path + "." + std::to_string(getpid()) + ".tmp";
  FILE *file = fopen(temporary.c_str(), "wb");
  if (file == nullptr) {
    return;
  }
  const uint64_t sizes[2] = {key.size(), value.size()};
  bool written = fwrite(sizes, sizeof(sizes), 1, file) == 1 &&
                 fwrite(key.data(), 1, key.size(), file) == key.size() &&
                 fwrite(value.data(), 1, value.size(), file) == value.size();
  written = fclose(file) == 0 && written;
  if (!written || rename(temporary.c_str(), path.c_str()) != 0) {
    remove(temporary.c_str());
    return;
  }
  writer.total += bytes - previousBytes;
}

// Dawn's buffers last only for this call: the bytes are copied, and written
// later on the writer.
void storeEntry(size_t keySize, const uint8_t *key, size_t valueSize,
                const uint8_t *value, void * /* userdata1 */,
                void * /* userdata2 */) {
  const std::string dir = directory();
  if (dir.empty()) {
    return;
  }
  if (entryBytes(keySize, valueSize) > kMaxEntryBytes) {
    refusedStores++;
    return;
  }
  Writer::shared().post(
      [dir, key = std::vector<uint8_t>(key, key + keySize),
       value = std::vector<uint8_t>(value, value + valueSize)] {
        writeEntry(dir, key, value);
      });
}

enum class Kind { Entry, Temporary, Other };

// An entry's name is 16 lowercase hex digits. A temporary file's is one
// followed by a dot, the writing process's id and ".tmp". Anything else in
// the directory is not the cache's to remove.
Kind kindOf(const std::string &name) {
  if (name.size() < 16) {
    return Kind::Other;
  }
  for (size_t i = 0; i < 16; i++) {
    const char c = name[i];
    if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) {
      return Kind::Other;
    }
  }
  if (name.size() == 16) {
    return Kind::Entry;
  }
  if (name[16] != '.') {
    return Kind::Other;
  }
  size_t i = 17;
  while (i < name.size() && name[i] >= '0' && name[i] <= '9') {
    i++;
  }
  return i > 17 && name.compare(i, std::string::npos, ".tmp") == 0
             ? Kind::Temporary
             : Kind::Other;
}

// Remembers the directory as measured now, as it is (see
// changedSinceMeasured). Runs on the writer.
void noteMeasured(const std::string &dir) {
  Writer &writer = Writer::shared();
  struct stat info{};
  writer.measuredModification =
      stat(dir.c_str(), &info) == 0 ? modificationTime(info) : timespec{};
  writer.measuredAt = std::chrono::steady_clock::now();
}

// The entries in the directory and their bytes together: none when the
// directory is gone. Removes the temporary files of writes a killed process
// left unfinished on the way. Runs on the writer.
Contents measure(const std::string &dir) {
  Contents contents;
  if (DIR *listing = opendir(dir.c_str())) {
    const time_t now = time(nullptr);
    while (dirent *entry = readdir(listing)) {
      const std::string name = entry->d_name;
      const Kind kind = kindOf(name);
      if (kind == Kind::Other) {
        continue;
      }
      const std::string path = dir + "/" + name;
      struct stat info{};
      if (stat(path.c_str(), &info) != 0) {
        continue;
      }
      if (kind == Kind::Temporary) {
        if (now - info.st_mtime > kAbandonedWriteSeconds) {
          remove(path.c_str());
        }
        continue;
      }
      contents.bytes += info.st_size;
      contents.entries.push_back(path);
    }
    closedir(listing);
  }
  noteMeasured(dir);
  return contents;
}

// Measures the directory, and removes every entry when together they are past
// kMaxCacheBytes: a cache that has outgrown the limit holds mostly what the
// app no longer uses, and one launch that builds everything is the price of
// starting over. Leaves the writer's total at what the directory holds. Runs
// on the writer.
void tidy(const std::string &dir) {
  Writer &writer = Writer::shared();
  Contents contents = measure(dir);
  if (contents.bytes > kMaxCacheBytes) {
    for (const auto &path : contents.entries) {
      remove(path.c_str());
    }
    contents.bytes = 0;
    noteMeasured(dir);
  }
  writer.total = contents.bytes;
  writer.tidied = dir;
}

} // namespace

void DawnBlobCache::setDirectory(const std::string &dir) {
  std::string usable = dir;
  if (!usable.empty()) {
    makeDirectories(usable);
    struct stat info{};
    if (stat(usable.c_str(), &info) != 0 || !S_ISDIR(info.st_mode)) {
      // Nowhere to keep blobs: leave the cache off rather than fail every
      // load and store.
      usable.clear();
    }
  }
  {
    std::lock_guard<std::mutex> lock(directoryMutex());
    directorySlot() = usable;
  }
  // Posted once the directory is in use, so that a store that reaches the
  // writer first is bound for this directory, and counted by the tidying. A
  // store still bound for the previous directory, queued after the tidying,
  // is counted against that one (see writeEntry).
  if (!usable.empty()) {
    Writer::shared().post([usable] { tidy(usable); });
  }
}

bool DawnBlobCache::chain(wgpu::DeviceDescriptor &descriptor,
                          WGPUDawnCacheDeviceDescriptor &storage) {
  if (directory().empty()) {
    return false;
  }
  storage.dawnLoadCacheDataCallbackInfo.callback = loadEntry;
  storage.dawnStoreCacheDataCallbackInfo.callback = storeEntry;
  storage.chain.next = reinterpret_cast<WGPUChainedStruct *>(
      const_cast<wgpu::ChainedStruct *>(descriptor.nextInChain));
  descriptor.nextInChain = reinterpret_cast<wgpu::ChainedStruct *>(&storage);
  return true;
}

void DawnBlobCache::post(std::function<void()> job) {
  Writer::shared().post(std::move(job));
}

uint64_t DawnBlobCache::refusedStoresOnThisThread() { return refusedStores; }

void DawnBlobCache::waitForWrites() { Writer::shared().wait(); }

} // namespace rnwgpu
