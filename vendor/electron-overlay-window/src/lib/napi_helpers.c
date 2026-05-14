#include <string.h>
#include "napi_helpers.h"

napi_value error_create(napi_env env) {
  napi_status status;
  napi_value error = NULL;
  bool is_exception_pending;
  const napi_extended_error_info* info;

  // We must retrieve the last error info before doing anything else, because
  // doing anything else will replace the last error info.
  status = napi_get_last_error_info(env, &info);
  NAPI_FATAL_IF_FAILED(status, "error_create", "napi_get_last_error_info");

  status = napi_is_exception_pending(env, &is_exception_pending);
  NAPI_FATAL_IF_FAILED(status, "error_create", "napi_is_exception_pending");

  // A pending exception takes precedence over any internal error status.
  if (is_exception_pending) {
    status = napi_get_and_clear_last_exception(env, &error);
    NAPI_FATAL_IF_FAILED(status, "error_create", "napi_get_and_clear_last_exception");
  }
  else {
    const char* error_message = info->error_message != NULL ?
      info->error_message : "Error in native callback";

    napi_value message;
    status = napi_create_string_utf8(
      env,
      error_message,
      strlen(error_message),
      &message);
    NAPI_FATAL_IF_FAILED(status, "error_create", "napi_create_string_utf8");

    switch (info->error_code) {
    case napi_object_expected:
    case napi_string_expected:
    case napi_boolean_expected:
    case napi_number_expected:
      status = napi_create_type_error(env, NULL, message, &error);
      NAPI_FATAL_IF_FAILED(status, "error_create", "napi_create_type_error");
      break;
    default:
      status = napi_create_error(env, NULL, message, &error);
      NAPI_FATAL_IF_FAILED(status, "error_create", "napi_create_error");
      break;
    }
  }

  return error;
}
