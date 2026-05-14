#include <node.h>
#include <windows.h>
#include <TlHelp32.h>
#include <vector>
#include "module.h"
#include "process.h"
#include "memoryjs.h"
#include <psapi.h>

DWORD64 module::getBaseAddress(const char *processName, DWORD processId)
{
  char *errorMessage = "";
  MODULEENTRY32 baseModule = module::findModule(processName, processId, &errorMessage);
  return (DWORD64)baseModule.modBaseAddr;
}

MODULEENTRY32 module::findModule(const char *moduleName, DWORD processId, char **errorMessage)
{
  MODULEENTRY32 module;
  bool found = false;

  std::vector<MODULEENTRY32> moduleEntries = getModules(processId, errorMessage);

  // Loop over every module
  for (std::vector<MODULEENTRY32>::size_type i = 0; i != moduleEntries.size(); i++)
  {
    // Check to see if this is the module we want.
    if (!strcmp(moduleEntries[i].szModule, moduleName))
    {
      // module is returned and moduleEntry is used internally for reading/writing to memory
      module = moduleEntries[i];
      found = true;
      break;
    }
  }

  if (!found)
  {
    *errorMessage = "unable to find module";
  }

  return module;
}

std::vector<MODULEENTRY32> module::getModules(DWORD processId, char **errorMessage)
{
  // Take a snapshot of all modules inside a given process.
  HANDLE hModuleSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, processId);
  MODULEENTRY32 mEntry;

  if (hModuleSnapshot == INVALID_HANDLE_VALUE)
  {
    *errorMessage = "method failed to take snapshot of the modules";
  }

  // Before use, set the structure size.
  mEntry.dwSize = sizeof(mEntry);

  // Exit if unable to find the first module.
  if (!Module32First(hModuleSnapshot, &mEntry))
  {
    CloseHandle(hModuleSnapshot);
    *errorMessage = "method failed to retrieve the first module";
  }

  std::vector<MODULEENTRY32> modules;

  // Loop through modules.
  do
  {
    // Add the module to the vector
    modules.push_back(mEntry);
  } while (Module32Next(hModuleSnapshot, &mEntry));

  CloseHandle(hModuleSnapshot);

  return modules;
}

std::vector<THREADENTRY32> module::getThreads(DWORD processId, char **errorMessage)
{
  HANDLE hThreadSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, processId);
  THREADENTRY32 mEntry;

  if (hThreadSnapshot == INVALID_HANDLE_VALUE)
  {
    *errorMessage = "method failed to take snapshot of the threads";
  }

  mEntry.dwSize = sizeof(mEntry);

  if (!Thread32First(hThreadSnapshot, &mEntry))
  {
    CloseHandle(hThreadSnapshot);
    *errorMessage = "method failed to retrieve the first thread";
  }

  std::vector<THREADENTRY32> threads;

  do
  {
    threads.push_back(mEntry);
  } while (Thread32Next(hThreadSnapshot, &mEntry));

  CloseHandle(hThreadSnapshot);

  return threads;
}

char* module::getFilePath(HANDLE handle)
{
  char *path = new char[100];
  int length = GetModuleFileNameExA(handle, NULL, path, 100);
  return path;
}