#pragma once
#ifndef MEMORYJS_H
#define MEMORYJS_H

#include <node.h>

using v8::Isolate;

class memoryjs {

public:
  memoryjs();
  ~memoryjs();

  static void throwError(char* error, Isolate* isolate);
};
#endif
#pragma once
