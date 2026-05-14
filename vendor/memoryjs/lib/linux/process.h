#pragma once
#ifndef PROCESS_H
#define PROCESS_H

#include <node.h>
#include <vector>
#include <unistd.h>
#include <cstdint>

using v8::Isolate;



class process {
public:
  process();
  ~process();

  // This should cover what CrewLink needs from getProcesses
  struct processStat {
    pid_t pid = 0;
    char comm[1024];
  };

  pid_t openProcess(const char* processName, const char** errorMessage);

  std::vector<processStat> getProcesses(const char** errorMessage);
};

#endif
#pragma once
