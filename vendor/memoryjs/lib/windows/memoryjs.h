#pragma once
#ifndef MEMORYJS_H
#define MEMORYJS_H
#define WIN32_LEAN_AND_MEAN

#include <node.h>
#include <windows.h>

using v8::Isolate;

class memoryjs {

public:
  memoryjs();
  ~memoryjs();

  static void throwError(char* error, Isolate* isolate);
};
#endif
#pragma once
