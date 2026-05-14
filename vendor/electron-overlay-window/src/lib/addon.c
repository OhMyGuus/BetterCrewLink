#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <node_api.h>
#include "napi_helpers.h"
#include "overlay_window.h"

static napi_threadsafe_function threadsafe_fn = NULL;

void ow_emit_event(struct ow_event *event)
{
  if (threadsafe_fn == NULL)
    return;

  struct ow_event *copied_event = malloc(sizeof(struct ow_event));
  memcpy(copied_event, event, sizeof(struct ow_event));

  napi_status status = napi_call_threadsafe_function(threadsafe_fn, copied_event, napi_tsfn_nonblocking);
  if (status == napi_closing)
  {
    threadsafe_fn = NULL;
    free(copied_event);
    return;
  }
  NAPI_FATAL_IF_FAILED(status, "ow_emit_event", "napi_call_threadsafe_function");
}

napi_value ow_event_to_js_object(napi_env env, struct ow_event *event)
{
  napi_status status;

  napi_value event_obj;
  status = napi_create_object(env, &event_obj);
  NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_object");

  napi_value e_type;
  status = napi_create_uint32(env, event->type, &e_type);
  NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_uint32");

  if (event->type == OW_ATTACH)
  {
    napi_value e_has_access;
    if (event->data.attach.has_access == -1)
    {
      status = napi_get_undefined(env, &e_has_access);
      NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_get_undefined");
    }
    else
    {
      status = napi_get_boolean(env, event->data.attach.has_access == 1, &e_has_access);
      NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_get_boolean");
    }

    napi_value e_is_fullscreen;
    if (event->data.attach.is_fullscreen == -1)
    {
      status = napi_get_undefined(env, &e_is_fullscreen);
      NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_get_undefined");
    }
    else
    {
      status = napi_get_boolean(env, event->data.attach.is_fullscreen == 1, &e_is_fullscreen);
      NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_get_boolean");
    }

    napi_value e_x;
    status = napi_create_int32(env, event->data.attach.bounds.x, &e_x);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_int32");

    napi_value e_y;
    status = napi_create_int32(env, event->data.attach.bounds.y, &e_y);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_int32");

    napi_value e_width;
    status = napi_create_uint32(env, event->data.attach.bounds.width, &e_width);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_uint32");

    napi_value e_height;
    status = napi_create_uint32(env, event->data.attach.bounds.height, &e_height);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_uint32");

    napi_property_descriptor descriptors[] = {
        {"type", NULL, NULL, NULL, NULL, e_type, napi_enumerable, NULL},
        {"hasAccess", NULL, NULL, NULL, NULL, e_has_access, napi_enumerable, NULL},
        {"isFullscreen", NULL, NULL, NULL, NULL, e_is_fullscreen, napi_enumerable, NULL},
        {"x", NULL, NULL, NULL, NULL, e_x, napi_enumerable, NULL},
        {"y", NULL, NULL, NULL, NULL, e_y, napi_enumerable, NULL},
        {"width", NULL, NULL, NULL, NULL, e_width, napi_enumerable, NULL},
        {"height", NULL, NULL, NULL, NULL, e_height, napi_enumerable, NULL},
    };
    status = napi_define_properties(env, event_obj, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_define_properties");
    return event_obj;
  }
  else if (event->type == OW_FULLSCREEN)
  {
    napi_value e_is_fullscreen;
    status = napi_get_boolean(env, event->data.fullscreen.is_fullscreen, &e_is_fullscreen);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_get_boolean");

    napi_property_descriptor descriptors[] = {
        {"type", NULL, NULL, NULL, NULL, e_type, napi_enumerable, NULL},
        {"isFullscreen", NULL, NULL, NULL, NULL, e_is_fullscreen, napi_enumerable, NULL},
    };
    status = napi_define_properties(env, event_obj, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_define_properties");
    return event_obj;
  }
  else if (event->type == OW_MOVERESIZE)
  {
    napi_value e_x;
    status = napi_create_int32(env, event->data.moveresize.bounds.x, &e_x);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_int32");

    napi_value e_y;
    status = napi_create_int32(env, event->data.moveresize.bounds.y, &e_y);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_int32");

    napi_value e_width;
    status = napi_create_uint32(env, event->data.moveresize.bounds.width, &e_width);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_uint32");

    napi_value e_height;
    status = napi_create_uint32(env, event->data.moveresize.bounds.height, &e_height);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_create_uint32");

    napi_property_descriptor descriptors[] = {
        {"type", NULL, NULL, NULL, NULL, e_type, napi_enumerable, NULL},
        {"x", NULL, NULL, NULL, NULL, e_x, napi_enumerable, NULL},
        {"y", NULL, NULL, NULL, NULL, e_y, napi_enumerable, NULL},
        {"width", NULL, NULL, NULL, NULL, e_width, napi_enumerable, NULL},
        {"height", NULL, NULL, NULL, NULL, e_height, napi_enumerable, NULL},
    };
    status = napi_define_properties(env, event_obj, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_define_properties");
    return event_obj;
  }
  else
  {
    napi_property_descriptor descriptors[] = {
        {"type", NULL, NULL, NULL, NULL, e_type, napi_enumerable, NULL},
    };
    status = napi_define_properties(env, event_obj, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
    NAPI_FATAL_IF_FAILED(status, "ow_event_to_js_object", "napi_define_properties");
    return event_obj;
  }
}

void tsfn_to_js_proxy(napi_env env, napi_value js_callback, void *context, void *_event)
{
  struct ow_event *event = (struct ow_event *)_event;

  napi_status status;

  napi_value event_obj = ow_event_to_js_object(env, event);

  napi_value global;
  status = napi_get_global(env, &global);
  NAPI_FATAL_IF_FAILED(status, "tsfn_to_js_proxy", "napi_get_global");

  status = napi_call_function(env, global, js_callback, 1, &event_obj, NULL);
  NAPI_FATAL_IF_FAILED(status, "tsfn_to_js_proxy", "napi_call_function");

  free(event);
}

napi_value AddonStart(napi_env env, napi_callback_info info)
{
  napi_status status;

  size_t info_argc = 3;
  napi_value info_argv[3];
  status = napi_get_cb_info(env, info, &info_argc, info_argv, NULL, NULL);
  NAPI_THROW_IF_FAILED(env, status, NULL);

  // [0] Overlay Window ID
  void *overlay_window_id;
  status = napi_get_buffer_info(env, info_argv[0], &overlay_window_id, NULL);
  NAPI_THROW_IF_FAILED(env, status, NULL);

  // [1] Target Window title
  size_t target_window_title_length;
  status = napi_get_value_string_utf8(env, info_argv[1], NULL, 0, &target_window_title_length);
  NAPI_THROW_IF_FAILED(env, status, NULL);
  char *target_window_title = malloc(sizeof(char) * target_window_title_length + 1);
  status = napi_get_value_string_utf8(env, info_argv[1], target_window_title, target_window_title_length + 1, NULL);
  NAPI_THROW_IF_FAILED(env, status, NULL);

  // [2] Event callback
  napi_value async_resource_name;
  status = napi_create_string_utf8(env, "OVERLAY_WINDOW", NAPI_AUTO_LENGTH, &async_resource_name);
  NAPI_THROW_IF_FAILED(env, status, NULL);
  status = napi_create_threadsafe_function(env, info_argv[2], NULL, async_resource_name, 0, 1, NULL, NULL, NULL, tsfn_to_js_proxy, &threadsafe_fn);
  NAPI_THROW_IF_FAILED(env, status, NULL);

  // printf("start(window=%x, title=\"%s\")\n", *((int*)overlay_window_id), target_window_title);
  ow_start_hook(target_window_title, overlay_window_id);

  return NULL;
}

napi_value AddonActivateOverlay(napi_env _env, napi_callback_info _info)
{
  ow_activate_overlay();
  return NULL;
}

napi_value AddondFocusTarget(napi_env env, napi_callback_info info)
{
  ow_focus_target();
  return NULL;
}

void AddonCleanUp(void *arg)
{
  // @TODO
  // UnhookWinEvent(win_event_hhook);
}

napi_value AddonStop(napi_env env, napi_callback_info info)
{
  ow_stop();
  return NULL;
}

NAPI_MODULE_INIT()
{
  napi_status status;
  napi_value export_fn;

  status = napi_create_function(env, NULL, 0, AddonStart, NULL, &export_fn);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_create_function");
  status = napi_set_named_property(env, exports, "start", export_fn);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_set_named_property");

  status = napi_create_function(env, NULL, 0, AddonStop, NULL, &export_fn);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_create_function");
  status = napi_set_named_property(env, exports, "stop", export_fn);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_set_named_property");

  status = napi_create_function(env, NULL, 0, AddonActivateOverlay, NULL, &export_fn);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_create_function");
  status = napi_set_named_property(env, exports, "activateOverlay", export_fn);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_set_named_property");

  status = napi_create_function(env, NULL, 0, AddondFocusTarget, NULL, &export_fn);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_create_function");
  status = napi_set_named_property(env, exports, "focusTarget", export_fn);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_set_named_property");

  status = napi_add_env_cleanup_hook(env, AddonCleanUp, NULL);
  NAPI_FATAL_IF_FAILED(status, "NAPI_MODULE_INIT", "napi_add_env_cleanup_hook");

  return exports;
}
