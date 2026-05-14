#pragma once

#if defined(_MSC_VER) && !defined(__clang__)
#include <intrin.h>

#ifndef __builtin_frame_address
#define __builtin_frame_address(level) _AddressOfReturnAddress()
#endif
#endif
