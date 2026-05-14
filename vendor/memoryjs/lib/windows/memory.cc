#include <node.h>
#include <windows.h>
#include <TlHelp32.h>
#include <vector>
#include "memory.h"

memory::memory() {}
memory::~memory() {}

std::vector<MEMORY_BASIC_INFORMATION> memory::getRegions(HANDLE hProcess) {
  std::vector<MEMORY_BASIC_INFORMATION> regions;

  MEMORY_BASIC_INFORMATION region;
  DWORD64 address;

  for (address = 0; VirtualQueryEx(hProcess, (LPVOID)address, &region, sizeof(region)) == sizeof(region); address += region.RegionSize) {
    regions.push_back(region);
  }

  return regions;
}