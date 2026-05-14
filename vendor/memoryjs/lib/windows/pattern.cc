#include <node.h>
#include <windows.h>
#include <TlHelp32.h>
#include <vector>
#include "pattern.h"
#include "memoryjs.h"
#include "process.h"
#include "memory.h"

#define INRANGE(x,a,b) (x >= a && x <= b) 
#define getBits( x ) (INRANGE(x,'0','9') ? (x - '0') : ((x&(~0x20)) - 'A' + 0xa))
#define getByte( x ) (getBits(x[0]) << 4 | getBits(x[1]))

pattern::pattern() {}
pattern::~pattern() {}

/* based off Y3t1y3t's implementation */
uintptr_t pattern::findPattern(HANDLE handle, MODULEENTRY32 module, const char* pattern, short sigType, uintptr_t patternOffset, uintptr_t addressOffset, uint32_t skip) { 
  auto moduleSize = uintptr_t(module.modBaseSize);
  auto moduleBase = uintptr_t(module.hModule);

  auto moduleBytes = std::vector<unsigned char>(moduleSize);
  ReadProcessMemory(handle, LPCVOID(moduleBase), &moduleBytes[0], moduleSize, nullptr);

  auto byteBase = const_cast<unsigned char*>(&moduleBytes.at(0));
  auto maxOffset = moduleSize - 0x1000;
  auto skipIndex = 0;
  for (auto offset = 0UL; offset < maxOffset; ++offset) {
    if (compareBytes(byteBase + offset, pattern) && skipIndex++ >= skip) {
      auto address = moduleBase + offset + patternOffset;

      /* read memory at pattern if flag is raised*/
      if (sigType & ST_READ) ReadProcessMemory(handle, LPCVOID(address), &address, sizeof(uintptr_t), nullptr);

      /* subtract image base if flag is raised */
      if (sigType & ST_SUBTRACT) address -= moduleBase;

      return address + addressOffset;
    }
  }

  // the method that calls this will check to see if the value is -2
	// and throw a 'no match' error
  return -2;
};

bool pattern::compareBytes(const unsigned char* bytes, const char* pattern) {
  for (; *pattern; *pattern != ' ' ? ++bytes : bytes, ++pattern) {
    if (*pattern == ' ' || *pattern == '?')
      continue;
		
    if (*bytes != getByte(pattern))
      return false;
    
    ++pattern;
  }
  
  return true;
}