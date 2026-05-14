#pragma once
#ifndef FUNCTIONS_H
#define FUNCTIONS_H
#define WIN32_LEAN_AND_MEAN

#include <node.h>
#include <windows.h>
#include <TlHelp32.h>
#include <vector>

enum Type {
  T_VOID = 0x0,
  T_STRING = 0x1,
  T_CHAR = 0x2,
  T_BOOL = 0x3,
  T_INT = 0x4,
  T_DOUBLE = 0x5,
  T_FLOAT = 0x6
};

struct Arg {
  Type type;
  LPVOID value;
};

struct Call {
  int returnValue;
  std::string returnString;
  DWORD exitCode;
};

namespace functions {
  LPVOID reserveString(HANDLE hProcess, const char* value, SIZE_T size);
  char readChar(HANDLE hProcess, DWORD64 address);

  template <class returnDataType>
  Call call(HANDLE pHandle, std::vector<Arg> args, Type returnType, DWORD64 address, char** errorMessage) {
    std::vector<unsigned char> argShellcode;

    std::reverse(args.begin(), args.end());

    for (auto &arg : args) {
      // 0x68: PUSH imm16/imm32
      // 0x6A: PUSH imm8

      if (arg.type == T_INT || arg.type == T_FLOAT) {
        argShellcode.push_back(0x68);
        int value = *static_cast<int*>(arg.value);

        // Little endian representation
        for (int i = 0; i < 4; i++) {
          int shifted = (value >> (i * 8)) & 0xFF;
          argShellcode.push_back(shifted);
        }

        continue;
      }

      if (arg.type == T_STRING) {
        argShellcode.push_back(0x68);
        std::string value = *static_cast<std::string*>(arg.value);
        LPVOID address = functions::reserveString(pHandle, value.c_str(), value.length());

        // Little endian representation
        for (int i = 0; i < 4; i++) {
          int shifted = ((int)address >> (i * 8)) & 0xFF;
          argShellcode.push_back(shifted);
        }

        continue;
      }

      argShellcode.push_back(0x6A);
      unsigned char value = *static_cast<unsigned char*>(arg.value);
      argShellcode.push_back(value);
    }

    // 83: ADD r/m16/32 imm8
    std::vector<unsigned char> callShellcode = {
      // call 0x00000000
      0xE8, 0x00, 0x00, 0x00, 0x00,
      // add esp, [arg count * 4]
      0x83, 0xC4, (unsigned char)(args.size() * 0x4),
    };

    LPVOID returnValuePointer = 0;
    if (returnType != T_VOID) {
      // We will reserve memory for where we want to store the result,
      // and move the return value to this address.
      returnValuePointer = VirtualAllocEx(pHandle, NULL, sizeof(returnDataType), MEM_RESERVE | MEM_COMMIT, PAGE_EXECUTE_READWRITE);

      if (returnType == T_FLOAT) {
        // fstp DWORD PTR [0x12345678]
        // when `call` is executed, if return type is float, it's stored
        // in fpu registers (st0 through st7). we can use the `fst`
        // instruction to move st0 to a place in memory
        // D9 FSTP m32real ST Store Floating Point Value and Pop
        // D9 = for m32
        callShellcode.push_back(0xD9);
        callShellcode.push_back(0x1C);
        callShellcode.push_back(0x25);
      } else if (returnType == T_DOUBLE) {
        // fstp QWORD PTR [0x12345678]
        // DD FSTP m64real ST Store Floating Point Value and Pop
        // DD = for m64
        callShellcode.push_back(0xDD);
        callShellcode.push_back(0x1C);
        callShellcode.push_back(0x25);
      } else {
        // mov [0x1234], eax
        // A3: MOVE moffs16/32 eAX
        // Call routines places return value inside EAX
        callShellcode.push_back(0xA3);
      }

      for (int i = 0; i < 4; i++) {
        int shifted = ((DWORD)returnValuePointer >> (i * 8)) & 0xFF;
        callShellcode.push_back(shifted);
      }
    }

    // C3: return
    callShellcode.push_back(0xC3);

    // concatenate the arg shellcode with the calling shellcode
    std::vector<unsigned char> shellcode;
    shellcode.reserve(argShellcode.size() + callShellcode.size());
    shellcode.insert(shellcode.end(), argShellcode.begin(), argShellcode.end());
    shellcode.insert(shellcode.end(), callShellcode.begin(), callShellcode.end());

    // 5 = 0xE8 (call) + 4 empty bytes for where the address will go
    int addessShellcodeOffset = argShellcode.size() + 5;

    // Allocate space for the shellcode
    SIZE_T size = shellcode.size() * sizeof(unsigned char);
    LPVOID pShellcode = VirtualAllocEx(pHandle, NULL, size, MEM_RESERVE | MEM_COMMIT, PAGE_EXECUTE_READWRITE);

    // `call` opcode takes relative address, so calculate the relative address
    // taking into account where the shellcode will be written in memory
    DWORD64 relative = address - (uintptr_t)pShellcode - addessShellcodeOffset;

    // Write the relative address to the shellcode
    for (int i = 0; i < 4; i++) {
      int shifted = (relative >> (i * 8)) & 0xFF;

      // argShellcode.size() will offset to the `0xE8` opcode, add 1 to offset that instruction
      shellcode.at(argShellcode.size() + 1 + i) = shifted;
    }

    // Write the shellcode
    WriteProcessMemory(pHandle, pShellcode, shellcode.data(), size, NULL);

    // Execute the shellcode
    HANDLE thread = CreateRemoteThread(pHandle, NULL, NULL, (LPTHREAD_START_ROUTINE)pShellcode, NULL, NULL, NULL);

    Call data = { 0, "", -1 };

    if (thread == NULL) {
      *errorMessage = "Unable to create remote thread.";
      getchar();
      return data;
    }

    WaitForSingleObject(thread, INFINITE);
    GetExitCodeThread(thread, &data.exitCode);

    if (returnType != T_VOID && returnType != T_STRING) {
      ReadProcessMemory(pHandle, (LPVOID)returnValuePointer, &data.returnValue, sizeof(int), NULL);
      VirtualFreeEx(pHandle, returnValuePointer, sizeof(int), MEM_RELEASE);
    }

    if (returnType == T_STRING) {
      // String is stored in memory somewhere
      // When returning a string, the address of the string is placed in EAX.
      // So we read the current returnValuePointer address to get the actual address of the string
      ReadProcessMemory(pHandle, (LPVOID)returnValuePointer, &returnValuePointer, sizeof(int), NULL);

      std::vector<char> chars;
      int offset = 0x0;
      while (true) {
        char c = functions::readChar(pHandle, (DWORD64)returnValuePointer + offset);
        chars.push_back(c);

        // break at 1 million chars
        if (offset == (sizeof(char) * 1000000)) {
          chars.clear();
          break;
        }

        // break at terminator (end of string)
        if (c == '\0') {
          break;
        }

        // go to next char
        offset += sizeof(char);
      }

      std::string str(chars.begin(), chars.end());
      // TODO: pass str as LPVOID and cast back to string
      data.returnString = str;
    }

    VirtualFreeEx(pHandle, pShellcode, size, MEM_RELEASE);

    return data;
  }
}

#endif
#pragma once
