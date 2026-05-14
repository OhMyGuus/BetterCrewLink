#ifndef ADDON_SRC_HELPERS_H_
#define ADDON_SRC_HELPERS_H_

#include <node_api.h>

#define NAPI_FATAL_IF_FAILED(status, location, message)  \
  do {                                                   \
    if ((status) != napi_ok) {                           \
      napi_fatal_error(location, NAPI_AUTO_LENGTH,       \
                       message, NAPI_AUTO_LENGTH);       \
    }                                                    \
  } while (0)

#define NAPI_THROW_IF_FAILED_VOID(env, status)           \
  if ((status) != napi_ok) {                             \
    NAPI_FATAL_IF_FAILED(                                \
      napi_throw(env, error_create(env)),                \
      "NAPI_THROW_IF_FAILED_VOID",                       \
      "napi_throw");                                     \
    return;                                              \
  }

#define NAPI_THROW_IF_FAILED(env, status, ...)           \
  if ((status) != napi_ok) {                             \
    NAPI_FATAL_IF_FAILED(                                \
      napi_throw(env, error_create(env)),                \
      "NAPI_THROW_IF_FAILED_VOID",                       \
      "napi_throw");                                     \
    return __VA_ARGS__;                                  \
  }

#define NAPI_THROW_VOID(env, code, msg)                  \
  do {                                                   \
    NAPI_FATAL_IF_FAILED(                                \
      napi_throw_error(env, (code), (msg)),              \
      "NAPI_THROW_VOID",                                 \
      "napi_throw_error");                               \
    return;                                              \
  } while (0)

#define NAPI_THROW(env, code, msg, ...)                  \
  do {                                                   \
    NAPI_FATAL_IF_FAILED(                                \
      napi_throw_error(env, (code), (msg)),              \
      "NAPI_THROW",                                      \
      "napi_throw_error");                               \
    return __VA_ARGS__;                                  \
  } while (0)


napi_value error_create(napi_env env);

#endif // !ADDON_SRC_HELPERS_H_
