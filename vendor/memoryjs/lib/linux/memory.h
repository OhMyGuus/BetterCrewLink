#pragma once
#ifndef MEMORY_H
#define MEMORY_H

#include <node.h>
#include <unistd.h>
#include <cstdint>
#include <cstring>
#include <cerrno>
#include <sys/uio.h>

class memory {
public:
  memory();
  ~memory();

  template <class dataType>
  dataType readMemory(pid_t hProcess, uintptr_t address) {
    dataType cRead;
    readMemoryData(hProcess, address, &cRead, sizeof(cRead));
    return cRead;
  }

  char* readBuffer(pid_t hProcess, uintptr_t address, size_t size) {
    char* buffer = new char[size];
    readMemoryData(hProcess, address, buffer, size);
    return buffer;
  }

  char readChar(pid_t hProcess, uintptr_t address) {
    char value = 0;
    readMemoryData(hProcess, address, &value, sizeof(value));
    return value;
  }

  void readMemoryData(pid_t pid, uintptr_t address, void *buffer, size_t size);
};
#endif
