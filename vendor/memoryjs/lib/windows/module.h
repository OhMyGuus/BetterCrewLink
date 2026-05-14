#pragma once
#ifndef MODULE_H
#define MODULE_H
#define WIN32_LEAN_AND_MEAN

#include <node.h>
#include <windows.h>
#include <TlHelp32.h>
#include <vector>

namespace module {
  DWORD64 getBaseAddress(const char* processName, DWORD processId);
  MODULEENTRY32 findModule(const char* moduleName, DWORD processId, char** errorMessage);
  std::vector<MODULEENTRY32> getModules(DWORD processId, char** errorMessage);
  std::vector<THREADENTRY32> getThreads(DWORD processId, char** errorMessage);
  char* getFilePath(HANDLE handle);

};
#endif
#pragma once
