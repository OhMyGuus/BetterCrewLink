#ifndef ADDON_SRC_OVERLAY_WINDOW_H_
#define ADDON_SRC_OVERLAY_WINDOW_H_

#include <stdint.h>
#include <uv.h>

enum ow_event_type {
  // target window is found
  OW_ATTACH = 1,
  // target window is active/foreground
  OW_FOCUS,
  // target window lost focus
  OW_BLUR,
  // target window is destroyed
  OW_DETACH,
  // target window fullscreen changed
  // only emitted on X11 backend
  OW_FULLSCREEN,
  // target window changed position or resized
  OW_MOVERESIZE,
};

struct ow_window_bounds {
  int32_t x;
  int32_t y;
  uint32_t width;
  uint32_t height;
};

struct ow_event_attach {
  // defined only on Windows
  int has_access;
  // defined only on Linux, only if changed
  int is_fullscreen;
  //
  struct ow_window_bounds bounds;
};

struct ow_event_fullscreen {
  bool is_fullscreen;
};

struct ow_event_moveresize {
  struct ow_window_bounds bounds;
};

struct ow_event {
  enum ow_event_type type;
  union {
    struct ow_event_attach attach;
    struct ow_event_fullscreen fullscreen;
    struct ow_event_moveresize moveresize;
  } data;
};

static uv_thread_t hook_tid;

void ow_stop();

void ow_start_hook(char* target_window_title, void* overlay_window_id);

void ow_activate_overlay();

void ow_focus_target();

void ow_emit_event(struct ow_event* event);

#endif
