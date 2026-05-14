# electron-overlay-window

[![](https://img.shields.io/npm/v/electron-overlay-window/latest?color=CC3534&label=electron-overlay-window&logo=npm&labelColor=212121)](https://www.npmjs.com/package/electron-overlay-window)

Library for creating overlay windows, intended to complement Electron.

Responsible for:
  - Finding target window by title
  - Making overlay window a child of target
  - Keeping position and size of overlay window with target in sync
  - Emits lifecycle events

![yarn demo:electron](https://i.imgur.com/Ej190zc.gif)

Important notes:
  - You can initialize library only once (overlay window must never die, and title by which target window is searched cannot be changed)
  - You can have only one overlay window
  - Found target window remains "valid" even if its title has changed
  - Correct behavior is guaranteed only for top-level windows *(A top-level window is a window that is not a child window, or has no parent window (which is the same as having the "desktop window" as a parent))*
  - Windows: target window must have the same or lower privilege level than overlay window
  - X11: library relies on EWHM, more specifically `_NET_ACTIVE_WINDOW`, `_NET_WM_STATE_FULLSCREEN`, `_NET_WM_NAME`

Supported backends:
  - Windows (7 - 10)
  - Linux (X11)

Recommended dev utils
- Windows: AccEvent (accevent.exe) and Inspect Object (inspect.exe) from Windows SDK
- X11: xwininfo, xprop, xev
