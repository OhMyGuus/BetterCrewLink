#pragma once
#ifndef PROCESS_H
#define PROCESS_H
#define WIN32_LEAN_AND_MEAN

#include <node.h>
#include <windows.h>
#include <TlHelp32.h>
#include <vector>

using v8::Isolate;

class process {
public:
  struct Pair {
    HANDLE handle;
    PROCESSENTRY32 process;
  };

  process();
  ~process();

  Pair openProcess(const char* processName, char** errorMessage);
  Pair openProcess(DWORD processId, char** errorMessage);
  void closeProcess(HANDLE hProcess);
  std::vector<PROCESSENTRY32> getProcesses(char** errorMessage);
};

#endif
#pragma once
