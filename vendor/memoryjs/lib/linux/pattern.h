#pragma once
#ifndef PATTERN_H
#define PATTERN_H

#include <node.h>
#include "module.h"

class pattern {
public:
  pattern();
  ~pattern();

  // Signature/pattern types
  enum {
    // normal: normal
    // read: read memory at pattern
    // subtract: subtract module base
    ST_NORMAL = 0x0,
    ST_READ = 0x1,
    ST_SUBTRACT = 0x2
  };

  uintptr_t findPattern(pid_t hProcess, module::Module module, uintptr_t baseAddress, const char* pattern, short sigType, uintptr_t patternOffset, uintptr_t addressOffset, uint32_t skip);
  bool compareBytes(const unsigned char* bytes, const char* pattern);
};

#endif
#pragma once
