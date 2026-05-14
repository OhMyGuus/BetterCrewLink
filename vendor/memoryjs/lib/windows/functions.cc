#include <node.h>
#include <windows.h>
#include <TlHelp32.h>
#include <vector>
#include "functions.h"

char functions::readChar(HANDLE hProcess, DWORD64 address) {
  char value;
  ReadProcessMemory(hProcess, (LPVOID)address, &value, sizeof(char), NULL);
  return value;
}

LPVOID functions::reserveString(HANDLE hProcess, const char* value, SIZE_T size) {
  LPVOID memoryAddress = VirtualAllocEx(hProcess, NULL, size, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
  WriteProcessMemory(hProcess, memoryAddress, value, size, NULL);
  return memoryAddress;
 }
