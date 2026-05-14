// TestTarget.cpp : Defines the entry point for the console application.
//
#include <tchar.h>
#include "stdio.h"
#include <Windows.h>

int value = 0;

__declspec(noinline) void routine() {
	value = 100;
}


int main()
{
	printf("This program will return an exit code of 0 if you successfuly modify the memory in the given time frame.\n\
\nWe want to modify the .code section of this exe.\n\
Address of operation is likely around: 0x%08X.\n\
Look for the MOV opcode + from its address to get the value address and modify it's memory you will need to change protection on the section of memory.\n", &routine);


	// Assert that the program is compiled and running with PAGE_EXECUTE_READ on the routine method.
	MEMORY_BASIC_INFORMATION mbi;
	if (VirtualQuery(&routine, &mbi, sizeof(mbi)) == 0) {
		printf("Unable to query memory protection for some reason.\n");
		return 1;
	}
	if (! (mbi.Protect & PAGE_EXECUTE_READ) ) {
		printf("Warning: Expecting memory to be EXECUTE_READ\n");
		return 1;
	}

	printf("The address of the value is at 0x%08X but please modify the code in the routine that is setting it to 100 to set it to something else.\n", &value);
	printf("On MSVC 2017 Release mode x86 I'm getting this address 0x%08X.\n", ((char*)&routine) + 6);


	int counter = 0;
	while (1) {
		// Intentionally set the value to this before and after the call.
		value = 0xDEADBEEF;

		routine();

		if (value != 100) {
			routine();
			if (value != 100) {
				return 0;
			}
			else {
				printf("Please modify the code not the value in memory.\n");
			}
		}

		value = 0xDEADBEEF;

		Sleep(1000);
		counter++;

		if (value != 0xDEADBEEF) {
			printf("You must modify the code not the value.\n");
		}

		if (counter > 60) {
			break;
		}
	}

	printf("Attempt time expired closing application as failed.\n");
    return 1;
}

