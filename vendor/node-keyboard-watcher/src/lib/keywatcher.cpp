#include <napi.h>
#include <uv.h>
#include <chrono>
#include <iostream>
#include <thread>
#include "keyhandler.h"
#include "shared.h"

static const Napi::CallbackInfo* info = nullptr;
static Napi::ThreadSafeFunction fnc;

void emitCallBack(Napi::Env env, Napi::Function jsCallback, KeyEvent* value) {
  // jsCallback.Call({Napi::String::New(env, value->stringType),
  //                 Napi::Number::New(env, value->keyId)});

  jsCallback.Call({Napi::String::New(env, value->stringType),
                   Napi::Number::New(env, value->keyId)});
  delete value;
};

void emit_event(KeyEvent* e) {
  fnc.NonBlockingCall(e, emitCallBack);
}

void event_Start(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  fnc = Napi::ThreadSafeFunction::New(
      env, info[0].As<Napi::Function>(), "THREADSAFE", 0, 1);

  StartKeyHandler();
}

void event_AddKeyHook(const Napi::CallbackInfo& info) {
  auto keyId = info[0].As<Napi::Number>().Int32Value();
  AddKeyHandler(keyId);
}

void event_ClearKeyHooks(const Napi::CallbackInfo& info) {
  ClearKeyHooks();
}

// Init
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("start", Napi::Function::New(env, event_Start));
  exports.Set("addKeyHook", Napi::Function::New(env, event_AddKeyHook));
  exports.Set("clearKeyHooks", Napi::Function::New(env, event_ClearKeyHooks));

  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);
