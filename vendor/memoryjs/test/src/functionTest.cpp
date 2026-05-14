#include <windows.h>
#include <iostream>
#include <TlHelp32.h>

float testAdd(float a) {
	std::cout << a << std::endl;
	return a;
}

int main() {
	DWORD offset = (DWORD)testAdd - (DWORD)GetModuleHandle(NULL);
	std::cout << "Function offset from base: 0x" << std::hex << offset << std::dec << std::endl;
	std::cout << "Absolute: 0x" << std::hex << (DWORD)testAdd << std::dec << std::endl;
	
	getchar();
	return 0;
}