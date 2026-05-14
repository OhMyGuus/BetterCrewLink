#include "getkeystate.hpp"
#include "win2x11keymap.hpp"
#ifndef _WIN32
#include <X11/Xlib.h>
#include <X11/keysym.h>
#include <cstdio>

int WinKeyCode2Keysym(int winKeyCode);

short X11GetKeyState(int keycode) {
  KeySym keySym = WinKeyCode2Keysym(keycode);
  Display *display;
  char keys_return[32];

  if ((display = XOpenDisplay(NULL)) == NULL) {
    printf("Failed to open X Display!\n");
    return -1;
  }

  if (keySym == winKeyCode2Keysym::MouseButton4 ||
      keySym == winKeyCode2Keysym::MouseButton5) {
    // Since BetterCrewLink only uses this for push to talk lets just ignore
    // the mouse scroll wheel. (Assuming that what MouseButton 4 and 5 are)
    XCloseDisplay(display);
    return 0;
  }

  // Get keyboard state.
  XQueryKeymap(display, keys_return);

  // Get the keycode from the keysym.
  KeyCode kc2 = XKeysymToKeycode(display, keySym);

  // Check that key's state.
  bool bKeyPressed = !!(keys_return[kc2 >> 3] & (1 << (kc2 & 7)));

  XCloseDisplay(display);

  // Return the value as 0x8000
  if (bKeyPressed) {
    return 0x8000;
  } else {
    return 0;
  }
}

int WinKeyCode2Keysym(int winKeyCode) {
  struct winKeyCode2Keysym::winKeyCode2Keysym result;

  for (size_t i = 0; i < winKeyCode2Keysym::arraySize; i++) {
    if (winKeyCode2Keysym::winKeyCode2Keysyms[i].winCode == winKeyCode) {
      return (int)winKeyCode2Keysym::winKeyCode2Keysyms[i].X11sym;
    }
  }

    return  (int) winKeyCode;

}

#endif
