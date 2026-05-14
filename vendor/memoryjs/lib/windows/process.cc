#include <node.h>
#include <windows.h>
#include <TlHelp32.h>
#include <vector>
#include "process.h"
#include "memoryjs.h"

process::process() {}
process::~process() {}

using v8::Exception;
using v8::Isolate;
using v8::String;

process::Pair process::openProcess(const char* processName, char** errorMessage){
  PROCESSENTRY32 process;
  HANDLE handle = NULL;

  // A list of processes (PROCESSENTRY32)
  std::vector<PROCESSENTRY32> processes = getProcesses(errorMessage);

  for (std::vector<PROCESSENTRY32>::size_type i = 0; i != processes.size(); i++) {
    // Check to see if this is the process we want.
    if (!strcmp(processes[i].szExeFile, processName)) {
      handle = OpenProcess(PROCESS_ALL_ACCESS, FALSE, processes[i].th32ProcessID);
      process = processes[i];
      break;
    }
  }

  if (handle == NULL) {
    *errorMessage = "unable to find process";
  }

  return {
    handle,
    process,
  };
}

process::Pair process::openProcess(DWORD processId, char** errorMessage) {
  PROCESSENTRY32 process;
  HANDLE handle = NULL;

  // A list of processes (PROCESSENTRY32)
  std::vector<PROCESSENTRY32> processes = getProcesses(errorMessage);

  for (std::vector<PROCESSENTRY32>::size_type i = 0; i != processes.size(); i++) {
    // Check to see if this is the process we want.
    if (processId == processes[i].th32ProcessID) {
      handle = OpenProcess(PROCESS_ALL_ACCESS, FALSE, processes[i].th32ProcessID);
      process = processes[i];
      break;
    }
  }

  if (handle == NULL) {
    *errorMessage = "unable to find process";
  }

  return {
    handle,
    process,
  };
}

void process::closeProcess(HANDLE hProcess){
  CloseHandle(hProcess);
}

std::vector<PROCESSENTRY32> process::getProcesses(char** errorMessage) {
  // Take a snapshot of all processes.
  HANDLE hProcessSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, NULL);
  PROCESSENTRY32 pEntry;

  if (hProcessSnapshot == INVALID_HANDLE_VALUE) {
    *errorMessage = "method failed to take snapshot of the process";
  }

  // Before use, set the structure size.
  pEntry.dwSize = sizeof(pEntry);

  // Exit if unable to find the first process.
  if (!Process32First(hProcessSnapshot, &pEntry)) {
    CloseHandle(hProcessSnapshot);
    *errorMessage = "method failed to retrieve the first process";
  }

  std::vector<PROCESSENTRY32> processes;

  // Loop through processes.
  do {
    // Add the process to the vector
    processes.push_back(pEntry);
  } while (Process32Next(hProcessSnapshot, &pEntry));

  CloseHandle(hProcessSnapshot);
  return processes;
}
