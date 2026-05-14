#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <xcb/xcb.h>
#include "overlay_window.h"

static xcb_connection_t* x_conn;
static xcb_window_t root;
static xcb_atom_t ATOM_NET_ACTIVE_WINDOW;
static xcb_atom_t ATOM_NET_WM_NAME;
static xcb_atom_t ATOM_UTF8_STRING;
static xcb_atom_t ATOM_NET_WM_STATE;
static xcb_atom_t ATOM_NET_WM_STATE_FULLSCREEN;

struct ow_target_window
{
  char* title;
  xcb_window_t window_id;
  bool is_focused;
  bool is_destroyed;
  bool is_fullscreen;
};

struct ow_overlay_window
{
  xcb_window_t window_id;
};

static xcb_window_t active_window = XCB_WINDOW_NONE;

static struct ow_target_window target_info = {
  .title = NULL,
  .window_id = XCB_WINDOW_NONE,
  .is_focused = false,
  .is_destroyed = false,
  .is_fullscreen = false // initial state of *overlay* window
};

static struct ow_overlay_window overlay_info = {
  .window_id = XCB_WINDOW_NONE
};

static xcb_window_t get_active_window() {
  xcb_get_property_reply_t* prop_reply = xcb_get_property_reply(x_conn, xcb_get_property(x_conn, 0, root, ATOM_NET_ACTIVE_WINDOW, XCB_ATOM_WINDOW, 0, 1), NULL);
  if (prop_reply == NULL) {
    return XCB_WINDOW_NONE;
  }
  xcb_window_t active_window = *((xcb_window_t*)xcb_get_property_value(prop_reply));
  free(prop_reply);
  return active_window;
}

static bool get_title(xcb_window_t wid, char** title) {
  if (wid == XCB_WINDOW_NONE) {
    *title = NULL;
    return true;
  }
  xcb_get_property_reply_t* prop_reply = xcb_get_property_reply(x_conn, xcb_get_property(x_conn, 0, wid, ATOM_NET_WM_NAME, ATOM_UTF8_STRING, 0, 100000), NULL);
  if (prop_reply == NULL) {
    return false;
  }
  int buffLenUtf8 = xcb_get_property_value_length(prop_reply);
  if (buffLenUtf8 == 0) {
    *title = NULL;
    free(prop_reply);
    return true;
  }
  *title = malloc(buffLenUtf8 + 1);
  memcpy(*title, xcb_get_property_value(prop_reply), buffLenUtf8);
  (*title)[buffLenUtf8] = '\0';
  free(prop_reply);
  return true;
}

static bool get_content_bounds(xcb_window_t wid, struct ow_window_bounds* bounds) {
  xcb_get_geometry_reply_t* geometry = xcb_get_geometry_reply(x_conn, xcb_get_geometry(x_conn, wid), NULL);
  if (geometry == NULL) {
    return false;
  }
  xcb_translate_coordinates_reply_t* translated = xcb_translate_coordinates_reply(x_conn, xcb_translate_coordinates(x_conn, wid, root, 0, 0), NULL);
  if (translated == NULL) {
    free(geometry);
    return false;
  }

  bounds->x = translated->dst_x;
  bounds->y = translated->dst_y;
  bounds->width = geometry->width;
  bounds->height = geometry->height;
  free(translated);
  free(geometry);
  return true;
}

static bool is_fullscreen_window(xcb_window_t wid, bool* is_fullscreen) {
  xcb_get_property_reply_t* prop_reply = xcb_get_property_reply(x_conn, xcb_get_property(x_conn, 0, wid, ATOM_NET_WM_STATE, XCB_ATOM_ATOM, 0, 100000), NULL);
  if (prop_reply == NULL) {
    return false;
  }
  *is_fullscreen = false;
  xcb_atom_t* wm_state = (xcb_atom_t*)xcb_get_property_value(prop_reply);
  for (unsigned i = 0; i < prop_reply->value_len; ++i) {
    if (wm_state[i] == ATOM_NET_WM_STATE_FULLSCREEN) {
      *is_fullscreen = true;
    }
  }
  free(prop_reply);
  return true;
}

static void handle_moveresize_xevent(struct ow_target_window* target_info) {
  struct ow_window_bounds bounds;
  if (get_content_bounds(target_info->window_id, &bounds)) {
    struct ow_event e = {
      .type = OW_MOVERESIZE,
      .data.moveresize = {
        .bounds = bounds
      }
    };
    ow_emit_event(&e);
  }
}

static void handle_fullscreen_xevent(struct ow_target_window* target_info) {
  bool is_fullscreen;
  if (is_fullscreen_window(target_info->window_id, &is_fullscreen)) {
    if (is_fullscreen != target_info->is_fullscreen) {
      target_info->is_fullscreen = is_fullscreen;
      struct ow_event e = {
        .type = OW_FULLSCREEN,
        .data.fullscreen = {
          .is_fullscreen = target_info->is_fullscreen
        }
      };
      ow_emit_event(&e);
    }
  }
}

static void check_and_handle_window(xcb_window_t wid, struct ow_target_window* target_info) {
  if (target_info->window_id != XCB_WINDOW_NONE) {
    if (target_info->window_id != wid) {
      if (target_info->is_focused) {
        target_info->is_focused = false;
        struct ow_event e = { .type = OW_BLUR };
        ow_emit_event(&e);
      }

      if (target_info->is_destroyed) {
        target_info->window_id = XCB_WINDOW_NONE;
        xcb_change_property(x_conn, XCB_PROP_MODE_REPLACE, overlay_info.window_id, XCB_ATOM_WM_TRANSIENT_FOR, XCB_ATOM_WINDOW, 32, 1, (void*)&target_info->window_id);

        target_info->is_destroyed = false;
        struct ow_event e = { .type = OW_DETACH };
        ow_emit_event(&e);
      }
    }
    else if (target_info->window_id == wid) {
      if (!target_info->is_focused) {
        target_info->is_focused = true;
        struct ow_event e = { .type = OW_FOCUS };
        ow_emit_event(&e);
      }
      return;
    }
  }

  char* title = NULL;
  if (!get_title(wid, &title) || title == NULL) {
    return;
  }
  bool is_equal = (strcmp(title, target_info->title) == 0);
  free(title);
  if (!is_equal) {
    return;
  }

  if (target_info->window_id != XCB_WINDOW_NONE) {
    uint32_t mask[] = { XCB_EVENT_MASK_NO_EVENT };
    xcb_change_window_attributes(x_conn, target_info->window_id, XCB_CW_EVENT_MASK, mask);
  }

  target_info->window_id = wid;
  xcb_change_property(x_conn, XCB_PROP_MODE_REPLACE, overlay_info.window_id, XCB_ATOM_WM_TRANSIENT_FOR, XCB_ATOM_WINDOW, 32, 1, (void*)&target_info->window_id);

  // listen for `_NET_WM_STATE` fullscreen and window move/resize/destroy
  uint32_t mask[] = { XCB_EVENT_MASK_PROPERTY_CHANGE | XCB_EVENT_MASK_STRUCTURE_NOTIFY };
  xcb_change_window_attributes(x_conn, target_info->window_id, XCB_CW_EVENT_MASK, mask);

  struct ow_event e = {
    .type = OW_ATTACH,
    .data.attach = {
      .has_access = -1,
      .is_fullscreen = -1
    }
  };
  bool is_fullscreen;
  if (
    is_fullscreen_window(target_info->window_id, &is_fullscreen) &&
    get_content_bounds(target_info->window_id, &e.data.attach.bounds)
  ) {
    if (is_fullscreen != target_info->is_fullscreen) {
      target_info->is_fullscreen = is_fullscreen;
      e.data.attach.is_fullscreen = is_fullscreen;
    }
    // emit OW_ATTACH
    ow_emit_event(&e);

    target_info->is_focused = true;
    e.type = OW_FOCUS;
    ow_emit_event(&e);
  } else {
    // something went wrong, did the target window die right after becoming active?
    target_info->window_id = XCB_WINDOW_NONE;
  }
}

static void hook_proc(xcb_generic_event_t* generic_event) {
  if (generic_event->response_type == XCB_DESTROY_NOTIFY) {
    xcb_destroy_notify_event_t* event = (xcb_destroy_notify_event_t*)generic_event;
    if (event->window == target_info.window_id) {
      target_info.is_destroyed = true;
      check_and_handle_window(XCB_WINDOW_NONE, &target_info);
    }
    return;
  }
  if (generic_event->response_type == XCB_CONFIGURE_NOTIFY) {
    xcb_configure_notify_event_t* event = (xcb_configure_notify_event_t*)generic_event;
    if (event->window == target_info.window_id) {
      handle_moveresize_xevent(&target_info);
    }
    return;
  }
  if (generic_event->response_type == XCB_PROPERTY_NOTIFY) {
    xcb_property_notify_event_t* event = (xcb_property_notify_event_t*)generic_event;
    if (event->window == root && event->atom == ATOM_NET_ACTIVE_WINDOW) {
      xcb_window_t old_active = active_window;
      active_window = get_active_window();

      if (old_active != target_info.window_id) {
        uint32_t mask[] = { XCB_EVENT_MASK_NO_EVENT };
        xcb_change_window_attributes(x_conn, old_active, XCB_CW_EVENT_MASK, mask);
      }
      if (active_window != XCB_WINDOW_NONE && active_window != target_info.window_id) {
        // listen for `_NET_WM_NAME`
        uint32_t mask[] = { XCB_EVENT_MASK_PROPERTY_CHANGE };
        xcb_change_window_attributes(x_conn, active_window, XCB_CW_EVENT_MASK, mask);
      }
      check_and_handle_window(active_window, &target_info);
    } else if (event->window == target_info.window_id && event->atom == ATOM_NET_WM_STATE) {
      handle_fullscreen_xevent(&target_info);
    } else if (event->window == active_window && event->atom == ATOM_NET_WM_NAME) {
      check_and_handle_window(active_window, &target_info);
    }
    return;
  }
}

static bool stopped = false;

static void hook_thread(void* _arg) {
  stopped = false;
  x_conn = xcb_connect(NULL, NULL);
  xcb_screen_t* screen = xcb_setup_roots_iterator(xcb_get_setup(x_conn)).data;
  root = screen->root;

  xcb_intern_atom_reply_t* atom_reply;
  atom_reply = xcb_intern_atom_reply(x_conn, xcb_intern_atom(x_conn, 0, strlen("_NET_ACTIVE_WINDOW"), "_NET_ACTIVE_WINDOW"), NULL);
  ATOM_NET_ACTIVE_WINDOW = atom_reply->atom;
  free(atom_reply);
  atom_reply = xcb_intern_atom_reply(x_conn, xcb_intern_atom(x_conn, 0, strlen("_NET_WM_NAME"), "_NET_WM_NAME"), NULL);
  ATOM_NET_WM_NAME = atom_reply->atom;
  free(atom_reply);
  atom_reply = xcb_intern_atom_reply(x_conn, xcb_intern_atom(x_conn, 0, strlen("UTF8_STRING"), "UTF8_STRING"), NULL);
  ATOM_UTF8_STRING = atom_reply->atom;
  free(atom_reply);
  atom_reply = xcb_intern_atom_reply(x_conn, xcb_intern_atom(x_conn, 0, strlen("_NET_WM_STATE"), "_NET_WM_STATE"), NULL);
  ATOM_NET_WM_STATE = atom_reply->atom;
  free(atom_reply);
  atom_reply = xcb_intern_atom_reply(x_conn, xcb_intern_atom(x_conn, 0, strlen("_NET_WM_STATE_FULLSCREEN"), "_NET_WM_STATE_FULLSCREEN"), NULL);
  ATOM_NET_WM_STATE_FULLSCREEN = atom_reply->atom;
  free(atom_reply);

  // listen for `_NET_ACTIVE_WINDOW` changes
  uint32_t mask[] = { XCB_EVENT_MASK_PROPERTY_CHANGE };
  xcb_change_window_attributes(x_conn, root, XCB_CW_EVENT_MASK, mask);

  active_window = get_active_window();
  if (active_window != XCB_WINDOW_NONE) {
    // listen for `_NET_WM_NAME`
    uint32_t mask[] = { XCB_EVENT_MASK_PROPERTY_CHANGE };
    xcb_change_window_attributes(x_conn, active_window, XCB_CW_EVENT_MASK, mask);
    check_and_handle_window(active_window, &target_info);
  }
  xcb_flush(x_conn);

  xcb_generic_event_t* event;
  while ((event = xcb_wait_for_event(x_conn)) && !stopped) {
    event->response_type = event->response_type & ~0x80;
    hook_proc(event);
    xcb_flush(x_conn);
    free(event);
  }
}

void ow_stop() {
  if (target_info.window_id != XCB_WINDOW_NONE) {
    uint32_t mask[] = { XCB_EVENT_MASK_NO_EVENT };
    xcb_change_window_attributes(x_conn, target_info.window_id, XCB_CW_EVENT_MASK, mask);
    target_info.window_id = XCB_WINDOW_NONE;
  }
  stopped = true;
}

void ow_start_hook(char* target_window_title, void* overlay_window_id) {
  target_info.title = target_window_title;
  overlay_info.window_id = *((xcb_window_t*)overlay_window_id);
  uv_thread_create(&hook_tid, hook_thread, NULL);
}

void ow_activate_overlay() {
  // noop
}

void ow_focus_target() {
  xcb_client_message_event_t* event = calloc(32, 1);
  event->response_type = XCB_CLIENT_MESSAGE;
  event->type = ATOM_NET_ACTIVE_WINDOW;
  event->window = target_info.window_id;
  event->format = 32;
  event->data.data32[0] = 1; // source indication = app
  event->data.data32[2] = overlay_info.window_id; // requestor's currently active window

  xcb_send_event(x_conn, 0, root, XCB_EVENT_MASK_SUBSTRUCTURE_NOTIFY | XCB_EVENT_MASK_SUBSTRUCTURE_REDIRECT, (char*)event);
  xcb_flush(x_conn);
  free(event);
}
