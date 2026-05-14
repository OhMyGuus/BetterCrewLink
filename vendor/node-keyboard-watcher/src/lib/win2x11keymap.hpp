#ifndef _WIN2X11KEYMAP_H
#define _WIN2X11KEYMAP_H
#ifndef _WIN32
#include <X11/Xlib.h>
#include <X11/keysym.h>

namespace winKeyCode2Keysym {
const int MouseButton4 = 0x05;
const int MouseButton5 = 0x06;
const size_t arraySize = 46;

struct winKeyCode2Keysym {
  int winCode = 0;
  int X11sym = 0;
};

const struct winKeyCode2Keysym winKeyCode2Keysyms[arraySize] = {
    {.winCode = 0x20, .X11sym = XK_space},
    {.winCode = 0x08, .X11sym = XK_BackSpace},
    {.winCode = 0x2e, .X11sym = XK_Delete},
    {.winCode = 0x0d, .X11sym = XK_Return},
    {.winCode = 0x26, .X11sym = XK_Up},
    {.winCode = 0x28, .X11sym = XK_Down},
    {.winCode = 0x24, .X11sym = XK_Left},
    {.winCode = 0x27, .X11sym = XK_Right},
    {.winCode = 0x24, .X11sym = XK_Home},
    {.winCode = 0x23, .X11sym = XK_End},
    {.winCode = 0x21, .X11sym = XK_Page_Up},
    {.winCode = 0x22, .X11sym = XK_Page_Down},
    {.winCode = 0x1b, .X11sym = XK_Escape},
    {.winCode = 0x11, .X11sym = XK_Control_L},
    {.winCode = 0x10, .X11sym = XK_Shift_L},
    {.winCode = 0x12, .X11sym = XK_Alt_L},
    {.winCode = 0x70, .X11sym = XK_F1},
    {.winCode = 0x71, .X11sym = XK_F2},
    {.winCode = 0x72, .X11sym = XK_F3},
    {.winCode = 0x73, .X11sym = XK_F4},
    {.winCode = 0x74, .X11sym = XK_F5},
    {.winCode = 0x75, .X11sym = XK_F6},
    {.winCode = 0x76, .X11sym = XK_F7},
    {.winCode = 0x77, .X11sym = XK_F8},
    {.winCode = 0x78, .X11sym = XK_F9},
    {.winCode = 0x79, .X11sym = XK_F10},
    {.winCode = 0x7a, .X11sym = XK_F11},
    {.winCode = 0x7b, .X11sym = XK_F12},
    {.winCode = 0x05, .X11sym = MouseButton4},
    {.winCode = 0x06, .X11sym = MouseButton5},
    {.winCode = 0x60, .X11sym = XK_KP_0},
    {.winCode = 0x61, .X11sym = XK_KP_1},
    {.winCode = 0x62, .X11sym = XK_KP_2},
    {.winCode = 0x63, .X11sym = XK_KP_3},
    {.winCode = 0x64, .X11sym = XK_KP_4},
    {.winCode = 0x65, .X11sym = XK_KP_5},
    {.winCode = 0x66, .X11sym = XK_KP_6},
    {.winCode = 0x67, .X11sym = XK_KP_7},
    {.winCode = 0x68, .X11sym = XK_KP_8},
    {.winCode = 0x69, .X11sym = XK_KP_9},
    {.winCode = 0xa0, .X11sym = XK_Shift_L},
    {.winCode = 0xa1, .X11sym = XK_Shift_R},
    {.winCode = 0xa2, .X11sym = XK_Control_L},
    {.winCode = 0xa3, .X11sym = XK_Control_R},
    {.winCode = 0xa4, .X11sym = XK_Alt_L},
    {.winCode = 0xa5, .X11sym = XK_Alt_R}};

} // namespace winKeyCode2Keysym
#endif
#endif