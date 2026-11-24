// Native benchmark harness: replays a parameter trace into a Faust-generated C++ engine,
// times it, and writes a 32-bit float WAV for a null test against the WebAssembly render.
// Research tool only; the app does not use it. See docs/computation.md.
//
//   faust -lang cpp -double -cn mydsp -I dsp dsp/deepwork.dsp -o deepwork.cpp
//   zig c++ -O2 -std=c++17 -target x86_64-windows-gnu -mcpu=x86_64_v2 -ffp-contract=off
//       -fno-fast-math -fno-sanitize=undefined -DFAUSTFLOAT=double -DHW_FTZ
//       -I . -DDSP_FILE="\"deepwork.cpp\"" tools/native/harness.cpp -o harness.exe
//   node tools/native/trace.ts low-light 20
//   harness renders/native/low-light.trace.txt 20 renders/native/low-light.native.wav
//   node tools/native/null.mjs renders/native/low-light.wasm.wav renders/native/low-light.native.wav
//
// HW_FTZ sets flush-to-zero / denormals-are-zero on the thread, as a native audio thread
// would, in place of Faust's in-code -ftz 2 (which WebAssembly needs, having no FTZ mode).
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <map>
#include <sstream>
#include <string>
#include <vector>
#include <xmmintrin.h>

struct Meta {
  virtual ~Meta() {}
  virtual void declare(const char*, const char*) = 0;
};
struct Soundfile;
struct UI {
  virtual ~UI() {}
  virtual void openTabBox(const char*) = 0;
  virtual void openHorizontalBox(const char*) = 0;
  virtual void openVerticalBox(const char*) = 0;
  virtual void closeBox() = 0;
  virtual void addButton(const char*, FAUSTFLOAT*) = 0;
  virtual void addCheckButton(const char*, FAUSTFLOAT*) = 0;
  virtual void addVerticalSlider(const char*, FAUSTFLOAT*, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT) = 0;
  virtual void addHorizontalSlider(const char*, FAUSTFLOAT*, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT) = 0;
  virtual void addNumEntry(const char*, FAUSTFLOAT*, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT) = 0;
  virtual void addHorizontalBargraph(const char*, FAUSTFLOAT*, FAUSTFLOAT, FAUSTFLOAT) = 0;
  virtual void addVerticalBargraph(const char*, FAUSTFLOAT*, FAUSTFLOAT, FAUSTFLOAT) = 0;
  virtual void addSoundfile(const char*, const char*, Soundfile**) = 0;
  virtual void declare(FAUSTFLOAT*, const char*, const char*) {}
};
struct dsp {
  virtual ~dsp() {}
  virtual int getNumInputs() = 0;
  virtual int getNumOutputs() = 0;
  virtual void buildUserInterface(UI*) = 0;
  virtual int getSampleRate() = 0;
  virtual void init(int) = 0;
  virtual void instanceInit(int) = 0;
  virtual void instanceConstants(int) = 0;
  virtual void instanceResetUserInterface() = 0;
  virtual void instanceClear() = 0;
  virtual dsp* clone() = 0;
  virtual void metadata(Meta*) = 0;
  virtual void compute(int, FAUSTFLOAT**, FAUSTFLOAT**) = 0;
};

#include DSP_FILE

struct MapUI : UI {
  std::vector<std::string> stack;
  std::map<std::string, FAUSTFLOAT*> zones;
  static std::string clean(const char* l) {
    std::string s(l);
    std::replace(s.begin(), s.end(), ' ', '_');
    return s;
  }
  void push(const char* l) { stack.push_back(clean(l)); }
  void add(const char* l, FAUSTFLOAT* z) {
    std::string p;
    for (auto& s : stack) p += "/" + s;
    zones[p + "/" + clean(l)] = z;
  }
  void openTabBox(const char* l) override { push(l); }
  void openHorizontalBox(const char* l) override { push(l); }
  void openVerticalBox(const char* l) override { push(l); }
  void closeBox() override { stack.pop_back(); }
  void addButton(const char* l, FAUSTFLOAT* z) override { add(l, z); }
  void addCheckButton(const char* l, FAUSTFLOAT* z) override { add(l, z); }
  void addVerticalSlider(const char* l, FAUSTFLOAT* z, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT) override { add(l, z); }
  void addHorizontalSlider(const char* l, FAUSTFLOAT* z, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT) override { add(l, z); }
  void addNumEntry(const char* l, FAUSTFLOAT* z, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT, FAUSTFLOAT) override { add(l, z); }
  void addHorizontalBargraph(const char* l, FAUSTFLOAT* z, FAUSTFLOAT, FAUSTFLOAT) override { add(l, z); }
  void addVerticalBargraph(const char* l, FAUSTFLOAT* z, FAUSTFLOAT, FAUSTFLOAT) override { add(l, z); }
  void addSoundfile(const char*, const char*, Soundfile**) override {}
};

struct ParamWrite {
  long block;
  FAUSTFLOAT* zone;
  double value;
};

static void writeWav(const char* file, const std::vector<float>& data, int nCh, int sr) {
  FILE* f = std::fopen(file, "wb");
  if (!f) return;
  uint32_t dataBytes = (uint32_t)(data.size() * 4), u32;
  uint16_t u16;
  std::fwrite("RIFF", 1, 4, f);
  u32 = 36 + dataBytes;
  std::fwrite(&u32, 4, 1, f);
  std::fwrite("WAVEfmt ", 1, 8, f);
  u32 = 16;
  std::fwrite(&u32, 4, 1, f);
  u16 = 3;
  std::fwrite(&u16, 2, 1, f);
  u16 = (uint16_t)nCh;
  std::fwrite(&u16, 2, 1, f);
  u32 = (uint32_t)sr;
  std::fwrite(&u32, 4, 1, f);
  u32 = (uint32_t)(sr * nCh * 4);
  std::fwrite(&u32, 4, 1, f);
  u16 = (uint16_t)(nCh * 4);
  std::fwrite(&u16, 2, 1, f);
  u16 = 32;
  std::fwrite(&u16, 2, 1, f);
  std::fwrite("data", 1, 4, f);
  std::fwrite(&dataBytes, 4, 1, f);
  std::fwrite(data.data(), 4, data.size(), f);
  std::fclose(f);
}

int main(int argc, char** argv) {
  if (argc < 4) {
    std::fprintf(stderr, "usage: harness trace seconds out.wav\n");
    return 2;
  }
#ifdef HW_FTZ
  _mm_setcsr(_mm_getcsr() | 0x8040);  // flush-to-zero + denormals-are-zero, as an audio thread would
#endif
  const int sr = 48000, block = 128;
  const double seconds = std::atof(argv[2]);
  const long blocks = (long)std::ceil(seconds * sr / block);

  int missing = 0;
  double best = 1e30;
  for (int run = 0; run < 3; run++) {
    mydsp* d = new mydsp();
    d->init(sr);
    MapUI ui;
    d->buildUserInterface(&ui);
    std::vector<ParamWrite> writes;
    std::ifstream in(argv[1]);
    std::string line;
    while (std::getline(in, line)) {
      std::istringstream ls(line);
      long b;
      std::string p;
      double v;
      if (!(ls >> b >> p >> v)) continue;
      auto it = ui.zones.find(p);
      if (it == ui.zones.end()) {
        if (run == 0) {
          std::fprintf(stderr, "no such param: %s\n", p.c_str());
          missing++;
        }
        continue;
      }
      writes.push_back({b, it->second, v});
    }
    const int nOut = d->getNumOutputs();
    std::vector<std::vector<FAUSTFLOAT>> buf(nOut, std::vector<FAUSTFLOAT>(block));
    std::vector<FAUSTFLOAT*> outs(nOut);
    for (int c = 0; c < nOut; c++) outs[c] = buf[c].data();
    std::vector<float> out((size_t)blocks * block * nOut);
    size_t w = 0, o = 0;
    auto t0 = std::chrono::steady_clock::now();
    for (long b = 0; b < blocks; b++) {
      while (w < writes.size() && writes[w].block <= b) {
        *writes[w].zone = (FAUSTFLOAT)writes[w].value;
        w++;
      }
      d->compute(block, nullptr, outs.data());
      for (int i = 0; i < block; i++)
        for (int c = 0; c < nOut; c++) out[o++] = (float)buf[c][i];
    }
    double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
    best = std::min(best, ms);
    if (run == 0) {
      std::printf("params=%zu outputs=%d missing=%d sizeof(dsp)=%zu bytes\n", ui.zones.size(), nOut, missing, sizeof(mydsp));
      writeWav(argv[3], out, nOut, sr);
    }
    delete d;
  }
  std::printf("%.1f%% of one core (best of 3, %.0f ms for %.0f s)\n", best / 10.0 / seconds, best, seconds);
  return 0;
}
