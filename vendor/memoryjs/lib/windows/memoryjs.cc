#include <windows.h>
#include <psapi.h>
#include <napi.h>
#include "module.h"
#include "process.h"
#include "memoryjs.h"
#include "memory.h"
#include "pattern.h"
#include "functions.h"

#pragma comment(lib, "psapi.lib")


process Process;
// module Module;
memory Memory;
pattern Pattern;
// functions Functions;

struct Vector3 {
  float x, y, z;
};

struct Vector4 {
  float w, x, y, z;
};

Napi::Value openProcess(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 1 && args.Length() != 2) {
    Napi::Error::New(env, "requires 1 argument, or 2 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsString() && !args[0].IsNumber()) {
    Napi::Error::New(env, "first argument must be a string or a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 2 && !args[1].IsFunction()) {
    Napi::Error::New(env, "second argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Define error message that may be set by the function that opens the process
  char* errorMessage = "";

  process::Pair pair;

  if (args[0].IsString()) {
    std::string processName(args[0].As<Napi::String>().Utf8Value());
    pair = Process.openProcess(processName.c_str(), &errorMessage);

    // In case it failed to open, let's keep retrying
    // while(!strcmp(process.szExeFile, "")) {
    //   process = Process.openProcess((char*) *(processName), &errorMessage);
    // };
  }

  if (args[0].IsNumber()) {
    pair = Process.openProcess(args[0].As<Napi::Number>().Uint32Value(), &errorMessage);

    // In case it failed to open, let's keep retrying
    // while(!strcmp(process.szExeFile, "")) {
    //   process = Process.openProcess(info[0].As<Napi::Number>().Uint32Value(), &errorMessage);
    // };
  }

  // If an error message was returned from the function that opens the process, throw the error.
  // Only throw an error if there is no callback (if there's a callback, the error is passed there).
  if (strcmp(errorMessage, "") && args.Length() != 2) {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  // Create a v8 Object (JSON) to store the process information
  Napi::Object processInfo = Napi::Object::New(env);

  processInfo.Set(Napi::String::New(env, "dwSize"), Napi::Value::From(env, (int)pair.process.dwSize));
  processInfo.Set(Napi::String::New(env, "th32ProcessID"), Napi::Value::From(env, (int)pair.process.th32ProcessID));
  processInfo.Set(Napi::String::New(env, "cntThreads"), Napi::Value::From(env, (int)pair.process.cntThreads));
  processInfo.Set(Napi::String::New(env, "th32ParentProcessID"), Napi::Value::From(env, (int)pair.process.th32ParentProcessID));
  processInfo.Set(Napi::String::New(env, "pcPriClassBase"), Napi::Value::From(env, (int)pair.process.pcPriClassBase));
  processInfo.Set(Napi::String::New(env, "szExeFile"), Napi::String::New(env, pair.process.szExeFile));
  processInfo.Set(Napi::String::New(env, "handle"), Napi::Value::From(env, (uintptr_t)pair.handle));

  DWORD64 base = module::getBaseAddress(pair.process.szExeFile, pair.process.th32ProcessID);
  processInfo.Set(Napi::String::New(env, "modBaseAddr"), Napi::Value::From(env, (uintptr_t)base));

  // openProcess can either take one argument or can take
  // two arguments for asychronous use (second argument is the callback)
  if (args.Length() == 2) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[1].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, errorMessage), processInfo });
    return env.Null();
  } else {
    // return JSON
    return processInfo;
  }
}

Napi::Value closeProcess(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 1) {
    Napi::Error::New(env, "requires 1 argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber()) {
    Napi::Error::New(env, "first argument must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  Process.closeProcess((HANDLE)args[0].As<Napi::Number>().Int64Value());
  return env.Null();
}

Napi::Value getProcesses(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() > 1) {
    Napi::Error::New(env, "requires either 0 arguments or 1 argument if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 1 && !args[0].IsFunction()) {
    Napi::Error::New(env, "first argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Define error message that may be set by the function that gets the processes
  char* errorMessage = "";

  std::vector<PROCESSENTRY32> processEntries = Process.getProcesses(&errorMessage);

  // If an error message was returned from the function that gets the processes, throw the error.
  // Only throw an error if there is no callback (if there's a callback, the error is passed there).
  if (strcmp(errorMessage, "") && args.Length() != 1) {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  // Creates v8 array with the size being that of the processEntries vector processes is an array of JavaScript objects
  Napi::Array processes = Napi::Array::New(env, processEntries.size());

  // Loop over all processes found
  for (std::vector<PROCESSENTRY32>::size_type i = 0; i != processEntries.size(); i++) {
    // Create a v8 object to store the current process' information
    Napi::Object process = Napi::Object::New(env);

    process.Set(Napi::String::New(env, "cntThreads"), Napi::Value::From(env, (int)processEntries[i].cntThreads));
    process.Set(Napi::String::New(env, "szExeFile"), Napi::String::New(env, processEntries[i].szExeFile));
    process.Set(Napi::String::New(env, "th32ProcessID"), Napi::Value::From(env, (int)processEntries[i].th32ProcessID));
    process.Set(Napi::String::New(env, "th32ParentProcessID"), Napi::Value::From(env, (int)processEntries[i].th32ParentProcessID));
    process.Set(Napi::String::New(env, "pcPriClassBase"), Napi::Value::From(env, (int)processEntries[i].pcPriClassBase));

    // Push the object to the array
    processes.Set(i, process);
  }

  /* getProcesses can either take no arguments or one argument
     one argument is for asychronous use (the callback) */
  if (args.Length() == 1) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[0].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, errorMessage), processes });
    return env.Null();
  } else {
    // return JSON
    return processes;
  }
}

Napi::Value getModules(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 1 && args.Length() != 2) {
    Napi::Error::New(env, "requires 1 argument, or 2 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber()) {
    Napi::Error::New(env, "first argument must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 2 && !args[1].IsFunction()) {
    Napi::Error::New(env, "first argument must be a number, second argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Define error message that may be set by the function that gets the modules
  char* errorMessage = "";

  std::vector<MODULEENTRY32> moduleEntries = module::getModules(args[0].As<Napi::Number>().Int32Value(), &errorMessage);

  // If an error message was returned from the function getting the modules, throw the error.
  // Only throw an error if there is no callback (if there's a callback, the error is passed there).
  if (strcmp(errorMessage, "") && args.Length() != 2) {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  // Creates v8 array with the size being that of the moduleEntries vector
  // modules is an array of JavaScript objects
  Napi::Array modules = Napi::Array::New(env, moduleEntries.size());

  // Loop over all modules found
  for (std::vector<MODULEENTRY32>::size_type i = 0; i != moduleEntries.size(); i++) {
    //  Create a v8 object to store the current module's information
    Napi::Object module = Napi::Object::New(env);

    module.Set(Napi::String::New(env, "modBaseAddr"), Napi::Value::From(env, (uintptr_t)moduleEntries[i].modBaseAddr));
    module.Set(Napi::String::New(env, "modBaseSize"), Napi::Value::From(env, (int)moduleEntries[i].modBaseSize));
    module.Set(Napi::String::New(env, "szExePath"), Napi::String::New(env, moduleEntries[i].szExePath));
    module.Set(Napi::String::New(env, "szModule"), Napi::String::New(env, moduleEntries[i].szModule));
    module.Set(Napi::String::New(env, "th32ModuleID"), Napi::Value::From(env, (int)moduleEntries[i].th32ProcessID));

    // Push the object to the array
    modules.Set(i, module);
  }

  // getModules can either take one argument or two arguments
  // one/two arguments is for asychronous use (the callback)
  if (args.Length() == 2) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[1].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, errorMessage), modules });
    return env.Null();
  } else {
    // return JSON
    return modules;
  }
}

Napi::Value getProcessPath(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 1) {
    Napi::Error::New(env, "requires 1 arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber()) {
    Napi::Error::New(env, "first  argument must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string errorMessage;
  Napi::Value retVal = env.Null();

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  char* path =  module::getFilePath(handle);
  return Napi::String::New(env, path);
}

Napi::Value findModule(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 1 && args.Length() != 2 && args.Length() != 3) {
    Napi::Error::New(env, "requires 1 argument, 2 arguments, or 3 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsString() && !args[1].IsNumber()) {
    Napi::Error::New(env, "first argument must be a string, second argument must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 3 && !args[2].IsFunction()) {
    Napi::Error::New(env, "third argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string moduleName(args[0].As<Napi::String>().Utf8Value());

  // Define error message that may be set by the function that gets the modules
  char* errorMessage = "";

  MODULEENTRY32 module = module::findModule(moduleName.c_str(), args[1].As<Napi::Number>().Int32Value(), &errorMessage);

  // If an error message was returned from the function getting the module, throw the error.
  // Only throw an error if there is no callback (if there's a callback, the error is passed there).
  if (strcmp(errorMessage, "") && args.Length() != 3) {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  // In case it failed to open, let's keep retrying
  while (!strcmp(module.szExePath, "")) {
    module = module::findModule(moduleName.c_str(), args[1].As<Napi::Number>().Int32Value(), &errorMessage);
  };

  // Create a v8 Object (JSON) to store the process information
  Napi::Object moduleInfo = Napi::Object::New(env);

  moduleInfo.Set(Napi::String::New(env, "modBaseAddr"), Napi::Value::From(env, (uintptr_t)module.modBaseAddr));
  moduleInfo.Set(Napi::String::New(env, "modBaseSize"), Napi::Value::From(env, (int)module.modBaseSize));
  moduleInfo.Set(Napi::String::New(env, "szExePath"), Napi::String::New(env, module.szExePath));
  moduleInfo.Set(Napi::String::New(env, "szModule"), Napi::String::New(env, module.szModule));
  moduleInfo.Set(Napi::String::New(env, "th32ProcessID"), Napi::Value::From(env, (int)module.th32ProcessID));
  moduleInfo.Set(Napi::String::New(env, "hModule"), Napi::Value::From(env, (uintptr_t)module.hModule));

  // findModule can either take one or two arguments,
  // three arguments for asychronous use (third argument is the callback)
  if (args.Length() == 3) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[2].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, errorMessage), moduleInfo });
    return env.Null();
  } else {
    // return JSON
    return moduleInfo;
  }
}

Napi::Value readMemory(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 3 && args.Length() != 4) {
    Napi::Error::New(env, "requires 3 arguments, or 4 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() && !args[1].IsNumber() && !args[2].IsString()) {
    Napi::Error::New(env, "first and second argument must be a number, third argument must be a string").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 4 && !args[3].IsFunction()) {
    Napi::Error::New(env, "fourth argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string dataTypeArg(args[2].As<Napi::String>().Utf8Value());
  const char* dataType = dataTypeArg.c_str();

  // Define the error message that will be set if no data type is recognised
  std::string errorMessage;
  Napi::Value retVal = env.Null();

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  DWORD64 address = args[1].As<Napi::Number>().Int64Value();

  if (!strcmp(dataType, "byte")) {

    unsigned char result = Memory.readMemory<unsigned char>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "int")) {

    int result = Memory.readMemory<int>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "int32")) {

    int32_t result = Memory.readMemory<int32_t>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "uint32")) {

    uint32_t result = Memory.readMemory<uint32_t>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "int64")) {

    int64_t result = Memory.readMemory<int64_t>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "uint64")) {

    uint64_t result = Memory.readMemory<uint64_t>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "dword")) {

    DWORD result = Memory.readMemory<DWORD>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "short")) {

    short result = Memory.readMemory<short>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "long")) {

    long result = Memory.readMemory<long>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "float")) {

    float result = Memory.readMemory<float>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "double")) {

    double result = Memory.readMemory<double>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "ptr") || !strcmp(dataType, "pointer")) {

    intptr_t result = Memory.readMemory<intptr_t>(handle, address);
    retVal = Napi::Value::From(env, result);

  } else if (!strcmp(dataType, "bool") || !strcmp(dataType, "boolean")) {

    bool result = Memory.readMemory<bool>(handle, address);
    retVal = Napi::Boolean::New(env, result);

  } else if (!strcmp(dataType, "string") || !strcmp(dataType, "str")) {

    std::vector<char> chars;
    int offset = 0x0;
    while (true) {
      char c = Memory.readChar(handle, address + offset);
      chars.push_back(c);

      // break at 1 million chars
      if (offset == (sizeof(char) * 1000000)) {
        chars.clear();
        break;
      }

      // break at terminator (end of string)
      if (c == '\0') {
        break;
      }

	  // go to next char
      offset += sizeof(char);
    }

    if (chars.size() == 0) {

      if (args.Length() == 4) errorMessage = "unable to read string (no null-terminator found after 1 million chars)";
      else
      {
        Napi::Error::New(env, "unable to read string (no null-terminator found after 1 million chars)").ThrowAsJavaScriptException();
        return env.Null();
      }

    } else {
      // vector -> string
      std::string str(chars.begin(), chars.end());

      retVal = Napi::String::New(env, str.c_str());
    }

  } else if (!strcmp(dataType, "vector3") || !strcmp(dataType, "vec3")) {

    Vector3 result = Memory.readMemory<Vector3>(handle, address);
    Napi::Object moduleInfo = Napi::Object::New(env);
    moduleInfo.Set(Napi::String::New(env, "x"), Napi::Value::From(env, result.x));
    moduleInfo.Set(Napi::String::New(env, "y"), Napi::Value::From(env, result.y));
    moduleInfo.Set(Napi::String::New(env, "z"), Napi::Value::From(env, result.z));

    retVal = moduleInfo;
  } else if (!strcmp(dataType, "vector4") || !strcmp(dataType, "vec4")) {

    Vector4 result = Memory.readMemory<Vector4>(handle, address);
    Napi::Object moduleInfo = Napi::Object::New(env);
    moduleInfo.Set(Napi::String::New(env, "w"), Napi::Value::From(env, result.w));
    moduleInfo.Set(Napi::String::New(env, "x"), Napi::Value::From(env, result.x));
    moduleInfo.Set(Napi::String::New(env, "y"), Napi::Value::From(env, result.y));
    moduleInfo.Set(Napi::String::New(env, "z"), Napi::Value::From(env, result.z));

    retVal = moduleInfo;
  } else {

    if (args.Length() == 4) errorMessage = "unexpected data type";
    else
    {
      Napi::Error::New(env, "unexpected data type").ThrowAsJavaScriptException();
      return env.Null();
    }
  }

  if (args.Length() == 4)
  {
    Napi::Function callback = args[3].As<Napi::Function>();
    if (!errorMessage.empty())
      callback.Call(env.Global(), { Napi::String::New(env, errorMessage) });
    else
      callback.Call(env.Global(), { Napi::String::New(env, ""), retVal });
    return env.Null();
  }
  else
  {
    return retVal;
  }
}

Napi::Value readBuffer(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 3 && args.Length() != 4) {
    Napi::Error::New(env, "requires 3 arguments, or 4 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() && !args[1].IsNumber() && !args[2].IsNumber()) {
    Napi::Error::New(env, "first, second and third arguments must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 4 && !args[3].IsFunction()) {
    Napi::Error::New(env, "fourth argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  DWORD64 address = args[1].As<Napi::Number>().Int64Value();
  SIZE_T size = args[2].As<Napi::Number>().Int64Value();
  char* data = Memory.readBuffer(handle, address, size);

  Napi::Buffer<char> buffer = Napi::Buffer<char>::New(env, data, size);

  if (args.Length() == 4) {
    Napi::Function callback = args[3].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, ""), buffer });
    return env.Null();
  } else {
    return buffer;
  }
}

Napi::Value writeMemory(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 4) {
    Napi::Error::New(env, "requires 4 arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() && !args[1].IsNumber() && !args[3].IsString()) {
    Napi::Error::New(env, "first and second argument must be a number, third argument must be a string").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string dataTypeArg(args[3].As<Napi::String>().Utf8Value());
  const char* dataType = dataTypeArg.c_str();

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  DWORD64 address = args[1].As<Napi::Number>().Int64Value();

  if (!strcmp(dataType, "byte")) {

    Memory.writeMemory<unsigned char>(handle, address, args[2].As<Napi::Number>().Uint32Value());

  } else if (!strcmp(dataType, "int")) {

    Memory.writeMemory<int>(handle, address, args[2].As<Napi::Number>().Int32Value());

  } else if (!strcmp(dataType, "int32")) {

    Memory.writeMemory<int32_t>(handle, address, args[2].As<Napi::Number>().Int32Value());

  } else if (!strcmp(dataType, "uint32")) {

    Memory.writeMemory<uint32_t>(handle, address, args[2].As<Napi::Number>().Uint32Value());

  } else if (!strcmp(dataType, "int64")) {

    Memory.writeMemory<int64_t>(handle, address, args[2].As<Napi::Number>().Int64Value());

  } else if (!strcmp(dataType, "uint64")) {

    Memory.writeMemory<uint64_t>(handle, address, args[2].As<Napi::Number>().Int64Value());

  } else if (!strcmp(dataType, "dword")) {

    Memory.writeMemory<DWORD>(handle, address, args[2].As<Napi::Number>().Uint32Value());

  } else if (!strcmp(dataType, "short")) {

    Memory.writeMemory<short>(handle, address, args[2].As<Napi::Number>().Int32Value());

  } else if (!strcmp(dataType, "long")) {

    Memory.writeMemory<long>(handle, address, args[2].As<Napi::Number>().Int32Value());

  } else if (!strcmp(dataType, "float")) {

    Memory.writeMemory<float>(handle, address, args[2].As<Napi::Number>().FloatValue());

  } else if (!strcmp(dataType, "double")) {

    Memory.writeMemory<double>(handle, address, args[2].As<Napi::Number>().DoubleValue());

  } else if (!strcmp(dataType, "bool") || !strcmp(dataType, "boolean")) {

    Memory.writeMemory<bool>(handle, address, args[2].As<Napi::Boolean>().Value());

  } else if (!strcmp(dataType, "string") || !strcmp(dataType, "str")) {

    std::string valueParam(args[2].As<Napi::String>().Utf8Value());
    valueParam.append("", 1);

    // Write String, Method 1
    //Memory.writeMemory<std::string>(handle, address, std::string(*valueParam));

    // Write String, Method 2
    Memory.writeMemory(handle, address, (char*) valueParam.data(), valueParam.size());

  } else if (!strcmp(dataType, "vector3") || !strcmp(dataType, "vec3")) {

    Napi::Object value = args[2].As<Napi::Object>();
    Vector3 vector = {
      value.Get(Napi::String::New(env, "x")).As<Napi::Number>().FloatValue(),
      value.Get(Napi::String::New(env, "y")).As<Napi::Number>().FloatValue(),
      value.Get(Napi::String::New(env, "z")).As<Napi::Number>().FloatValue()
    };
    Memory.writeMemory<Vector3>(handle, address, vector);

  } else if (!strcmp(dataType, "vector4") || !strcmp(dataType, "vec4")) {

    Napi::Object value = args[2].As<Napi::Object>();
    Vector4 vector = {
      value.Get(Napi::String::New(env, "w")).As<Napi::Number>().FloatValue(),
      value.Get(Napi::String::New(env, "x")).As<Napi::Number>().FloatValue(),
      value.Get(Napi::String::New(env, "y")).As<Napi::Number>().FloatValue(),
      value.Get(Napi::String::New(env, "z")).As<Napi::Number>().FloatValue()
    };
    Memory.writeMemory<Vector4>(handle, address, vector);

  } else {

    Napi::Error::New(env, "unexpected data type").ThrowAsJavaScriptException();
  }

  return env.Null();
}

Napi::Value writeBuffer(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 3) {
    Napi::Error::New(env, "required 3 arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() && !args[1].IsNumber()) {
    Napi::Error::New(env, "first and second argument must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  DWORD64 address = args[1].As<Napi::Number>().Int64Value();
  SIZE_T length = args[2].As<Napi::Buffer<char>>().Length();
  char* data = args[2].As<Napi::Buffer<char>>().Data();
  Memory.writeMemory<char*>(handle, address, data, length);

  return env.Null();
}

Napi::Value findPattern(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  // if (args.Length() != 5 && args.Length() != 6) {
  //   Napi::Error::New(env, "requires 5 arguments, or 6 arguments if a callback is being used").ThrowAsJavaScriptException();
  //   return env.Null();
  // }

  // if (!args[0].IsNumber() && !args[1].IsString() && !args[2].IsNumber() && !args[3].IsNumber() && !args[4].IsNumber()) {
  //   Napi::Error::New(env, "first argument must be a number, the remaining arguments must be numbers apart from the callback").ThrowAsJavaScriptException();
  //   return env.Null();
  // }

  // if (args.Length() == 6 && !args[5].IsFunction()) {
  //   Napi::Error::New(env, "sixth argument must be a function").ThrowAsJavaScriptException();
  //   return env.Null();
  // }

  // Address of findPattern result
  uintptr_t address = -1;

  // Define error message that may be set by the function that gets the modules
  char* errorMessage = "";

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();

  std::vector<MODULEENTRY32> moduleEntries = module::getModules(GetProcessId(handle), &errorMessage);

  // If an error message was returned from the function getting the modules, throw the error.
  // Only throw an error if there is no callback (if there's a callback, the error is passed there).
  if (strcmp(errorMessage, "") && args.Length() != 7) {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  for (std::vector<MODULEENTRY32>::size_type i = 0; i != moduleEntries.size(); i++) {
    std::string moduleName(args[1].As<Napi::String>().Utf8Value());

    if (!strcmp(moduleEntries[i].szModule, moduleName.c_str())) {
      std::string signature(args[2].As<Napi::String>().Utf8Value());

      // const char* pattern = signature.c_str();
      short sigType = args[3].As<Napi::Number>().Uint32Value();
      uint32_t patternOffset = args[4].As<Napi::Number>().Uint32Value();
      uint32_t addressOffset = args[5].As<Napi::Number>().Uint32Value();
      uint32_t skip = args[6].As<Napi::Number>().Uint32Value();

      address = Pattern.findPattern(handle, moduleEntries[i], signature.c_str(), sigType, patternOffset, addressOffset, skip);
      break;
    }
  }

  // If no error was set by getModules and the address is still the value we set it as, it probably means we couldn't find the module
  if (strcmp(errorMessage, "") && address == -1) errorMessage = "unable to find module";

  // If no error was set by getModules and the address is -2 this means there was no match to the pattern
  if (strcmp(errorMessage, "") && address == -2) errorMessage = "no match found";

  // findPattern can be asynchronous
  if (args.Length() == 8) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[7].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, errorMessage), Napi::Value::From(env, address) });
    return env.Null();
  } else {
    // return JSON
    return Napi::Value::From(env, address);
  }
}

Napi::Value callFunction(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 4 && args.Length() != 5) {
    Napi::Error::New(env, "requires 4 arguments, 5 with callback").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() && !args[1].IsObject() && !args[2].IsNumber() && !args[3].IsNumber()) {
    Napi::Error::New(env, "invalid arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // TODO: temp (?) solution to forcing variables onto the heap
  // to ensure consistent addresses. copy everything to a vector, and use the
  // vector's instances of the variables as the addresses being passed to `functions.call()`.
  // Another solution: do `int x = new int(4)` and then use `&x` for the address
  std::vector<LPVOID> heap;

  std::vector<Arg> parsedArgs;
  Napi::Array arguments = args[1].As<Napi::Array>();
  for (unsigned int i = 0; i < arguments.Length(); i++) {
    Napi::Object argument = arguments.Get(i).As<Napi::Object>();

    Type type = (Type) argument.Get(Napi::String::New(env, "type")).As<Napi::Number>().Uint32Value();

    if (type == T_STRING) {
      std::string stringValue = argument.Get(Napi::String::New(env, "value")).As<Napi::String>().Utf8Value();
      parsedArgs.push_back({ type, &stringValue });
    }

    if (type == T_INT) {
      int data = argument.Get(Napi::String::New(env, "value")).As<Napi::Number>().Int32Value();

      // As we only pass the addresses of the variable to the `call` function and not a copy
      // of the variable itself, we need to ensure that the variable stays alive and in a unique
      // memory location until the `call` function has been executed. So manually allocate memory,
      // track it, and then free it once the function has been called.
      // TODO: find a better solution?
      int* memory = (int*) malloc(sizeof(int));
      *memory = data;
      heap.push_back(memory);

      parsedArgs.push_back({ type, memory });
    }

    if (type == T_FLOAT) {
      float data = argument.Get(Napi::String::New(env, "value")).As<Napi::Number>().FloatValue();

      float* memory = (float*) malloc(sizeof(float));
      *memory = data;
      heap.push_back(memory);

      parsedArgs.push_back({ type, memory });
    }
  }

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  Type returnType = (Type) args[2].As<Napi::Number>().Uint32Value();
  DWORD64 address = args[3].As<Napi::Number>().Int64Value();

  char* errorMessage = "";
  Call data = functions::call<int>(handle, parsedArgs, returnType, address, &errorMessage);

  // Free all the memory we allocated
  for (auto &memory : heap) {
    free(memory);
  }

  heap.clear();

  Napi::Object info = Napi::Object::New(env);

  Napi::String keyString = Napi::String::New(env, "returnValue");

  if (returnType == T_STRING) {
    info.Set(keyString, Napi::String::New(env, data.returnString.c_str()));
  }

  if (returnType == T_CHAR) {
    info.Set(keyString, Napi::Value::From(env, (char) data.returnValue));
  }

  if (returnType == T_BOOL) {
    info.Set(keyString, Napi::Value::From(env, (bool) data.returnValue));
  }

  if (returnType == T_INT) {
    info.Set(keyString, Napi::Value::From(env, (int) data.returnValue));
  }

  if (returnType == T_FLOAT) {
    float value = *(float *)&data.returnValue;
    info.Set(keyString, Napi::Value::From(env, value));
  }

  if (returnType == T_DOUBLE) {
    double value = *(double *)&data.returnValue;
    info.Set(keyString, Napi::Value::From(env, value));
  }

  info.Set(Napi::String::New(env, "exitCode"), Napi::Value::From(env, data.exitCode));

  if (args.Length() == 5) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[2].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, errorMessage), info });
    return env.Null();
  } else {
    // return JSON
    return info;
  }

}

Napi::Value virtualProtectEx(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 4 && args.Length() != 5) {
    Napi::Error::New(env, "requires 4 arguments, 5 with callback").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() && !args[1].IsNumber() && !args[2].IsNumber()) {
    Napi::Error::New(env, "All arguments should be numbers.").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 5 && !args[4].IsFunction()) {
    Napi::Error::New(env, "callback needs to be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  DWORD result;
  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  DWORD64 address = args[1].As<Napi::Number>().Int64Value();
  SIZE_T size = args[2].As<Napi::Number>().Int64Value();
  DWORD protection = args[3].As<Napi::Number>().Uint32Value();

  bool success = VirtualProtectEx(handle, (LPVOID) address, size, protection, &result);

  char* errorMessage = "";

  if (success == 0) {
    errorMessage = "an error occurred calling VirtualProtectEx";
    // errorMessage = GetLastErrorToString().c_str();
  }

  // If there is an error and there is no callback, throw the error
  if (strcmp(errorMessage, "") && args.Length() != 5) {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 5) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[5].As<Napi::Function>();
    callback.Call(env.Global(), {
      Napi::String::New(env, errorMessage),
      Napi::Value::From(env, result)
    });
    return env.Null();
  } else {
    return Napi::Value::From(env, result);
  }
}

Napi::Value getRegions(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 1 && args.Length() != 2) {
    Napi::Error::New(env, "requires 1 argument, 2 with callback").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber()) {
    Napi::Error::New(env, "invalid arguments: first argument must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 2 && !args[1].IsFunction()) {
    Napi::Error::New(env, "callback needs to be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  std::vector<MEMORY_BASIC_INFORMATION> regions = Memory.getRegions(handle);

  Napi::Array regionsArray = Napi::Array::New(env, regions.size());

  for (std::vector<MEMORY_BASIC_INFORMATION>::size_type i = 0; i != regions.size(); i++) {
    Napi::Object region = Napi::Object::New(env);

    region.Set(Napi::String::New(env, "BaseAddress"), Napi::Value::From(env, (DWORD64) regions[i].BaseAddress));
    region.Set(Napi::String::New(env, "AllocationBase"), Napi::Value::From(env, (DWORD64) regions[i].AllocationBase));
    region.Set(Napi::String::New(env, "AllocationProtect"), Napi::Value::From(env, (DWORD) regions[i].AllocationProtect));
    region.Set(Napi::String::New(env, "RegionSize"), Napi::Value::From(env, (SIZE_T) regions[i].RegionSize));
    region.Set(Napi::String::New(env, "State"), Napi::Value::From(env, (DWORD) regions[i].State));
    region.Set(Napi::String::New(env, "Protect"), Napi::Value::From(env, (DWORD) regions[i].Protect));
    region.Set(Napi::String::New(env, "Type"), Napi::Value::From(env, (DWORD) regions[i].Type));

    char moduleName[MAX_PATH];
    DWORD size = GetModuleFileNameExA(handle, (HINSTANCE)regions[i].AllocationBase, moduleName, MAX_PATH);

    if (size != 0) {
      region.Set(Napi::String::New(env, "szExeFile"), Napi::String::New(env, moduleName));
    }


    regionsArray.Set(i, region);
  }

  if (args.Length() == 2) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[1].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, ""), regionsArray });
    return env.Null();
  } else {
    // return JSON
    return regionsArray;
  }
}

Napi::Value virtualQueryEx(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 2 && args.Length() != 3) {
    Napi::Error::New(env, "requires 2 arguments, 3 with callback").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() || !args[1].IsNumber()) {
    Napi::Error::New(env, "first and second argument need to be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 3 && !args[2].IsFunction()) {
    Napi::Error::New(env, "callback needs to be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  DWORD64 address = args[1].As<Napi::Number>().Int64Value();

  MEMORY_BASIC_INFORMATION information;
  SIZE_T result = VirtualQueryEx(handle, (LPVOID)address, &information, sizeof(information));

  char* errorMessage = "";

  if (result == 0 || result != sizeof(information)) {
    errorMessage = "an error occurred calling VirtualQueryEx";
    // errorMessage = GetLastErrorToString().c_str();
  }

  // If there is an error and there is no callback, throw the error
  if (strcmp(errorMessage, "") && args.Length() != 3) {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object region = Napi::Object::New(env);

  region.Set(Napi::String::New(env, "BaseAddress"), Napi::Value::From(env, (DWORD64) information.BaseAddress));
  region.Set(Napi::String::New(env, "AllocationBase"), Napi::Value::From(env, (DWORD64) information.AllocationBase));
  region.Set(Napi::String::New(env, "AllocationProtect"), Napi::Value::From(env, (DWORD) information.AllocationProtect));
  region.Set(Napi::String::New(env, "RegionSize"), Napi::Value::From(env, (SIZE_T) information.RegionSize));
  region.Set(Napi::String::New(env, "State"), Napi::Value::From(env, (DWORD) information.State));
  region.Set(Napi::String::New(env, "Protect"), Napi::Value::From(env, (DWORD) information.Protect));
  region.Set(Napi::String::New(env, "Type"), Napi::Value::From(env, (DWORD) information.Type));

  if (args.Length() == 3) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[1].As<Napi::Function>();
    callback.Call(env.Global(), { Napi::String::New(env, ""), region });
    return env.Null();
  } else {
    // return JSON
    return region;
  }
}

Napi::Value virtualAllocEx(const Napi::CallbackInfo& args) {
  Napi::Env env = args.Env();

  if (args.Length() != 5 && args.Length() != 6) {
    Napi::Error::New(env, "requires 5 arguments, 6 with callback").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() || !args[2].IsNumber() || !args[3].IsNumber() || !args[4].IsNumber()) {
    Napi::Error::New(env, "invalid arguments: arguments 0, 2, 3 and 4 need to be numbers").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 6 && !args[5].IsFunction()) {
    Napi::Error::New(env, "callback needs to be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  HANDLE handle = (HANDLE)args[0].As<Napi::Number>().Int64Value();
  SIZE_T size = args[2].As<Napi::Number>().Int64Value();
  DWORD allocationType = args[3].As<Napi::Number>().Uint32Value();
  DWORD protection = args[4].As<Napi::Number>().Uint32Value();
  LPVOID address;

  // Means in the JavaScript space `null` was passed through.
  if (args[1] == env.Null()) {
    address = NULL;
  } else {
    address = (LPVOID) args[1].As<Napi::Number>().Int64Value();
  }

  LPVOID allocatedAddress = VirtualAllocEx(handle, address, size, allocationType, protection);

  char* errorMessage = "";

  // If null, it means an error occurred
  if (allocatedAddress == NULL) {
    errorMessage = "an error occurred calling VirtualAllocEx";
    // errorMessage = GetLastErrorToString().c_str();
  }

  // If there is an error and there is no callback, throw the error
  if (strcmp(errorMessage, "") && args.Length() != 6) {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 6) {
    // Callback to let the user handle with the information
    Napi::Function callback = args[5].As<Napi::Function>();
    callback.Call(env.Global(), {
      Napi::String::New(env, errorMessage),
      Napi::Value::From(env, (intptr_t)allocatedAddress)
    });
    return env.Null();
  } else {
    return Napi::Value::From(env, (intptr_t)allocatedAddress);
  }
}



// https://stackoverflow.com/a/17387176
std::string GetLastErrorToString() {
  DWORD errorMessageID = ::GetLastError();

  // No error message, return empty string
  if(errorMessageID == 0) {
    return std::string();
  }

  LPSTR messageBuffer = nullptr;

  size_t size = FormatMessageA(
    FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
    NULL,
    errorMessageID,
    MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
    (LPSTR)&messageBuffer,
    0,
    NULL
  );

  std::string message(messageBuffer, size);

  // Free the buffer
  LocalFree(messageBuffer);
  return message;
}

Napi::Object init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "openProcess"), Napi::Function::New(env, openProcess));
  exports.Set(Napi::String::New(env, "closeProcess"), Napi::Function::New(env, closeProcess));
  exports.Set(Napi::String::New(env, "getProcesses"), Napi::Function::New(env, getProcesses));
  exports.Set(Napi::String::New(env, "getModules"), Napi::Function::New(env, getModules));
  exports.Set(Napi::String::New(env, "findModule"), Napi::Function::New(env, findModule));
  exports.Set(Napi::String::New(env, "getProcessPath"), Napi::Function::New(env, getProcessPath));
  exports.Set(Napi::String::New(env, "readMemory"), Napi::Function::New(env, readMemory));
  exports.Set(Napi::String::New(env, "readBuffer"), Napi::Function::New(env, readBuffer));
  exports.Set(Napi::String::New(env, "writeMemory"), Napi::Function::New(env, writeMemory));
  exports.Set(Napi::String::New(env, "writeBuffer"), Napi::Function::New(env, writeBuffer));
  exports.Set(Napi::String::New(env, "findPattern"), Napi::Function::New(env, findPattern));
  exports.Set(Napi::String::New(env, "virtualProtectEx"), Napi::Function::New(env, virtualProtectEx));
  exports.Set(Napi::String::New(env, "callFunction"), Napi::Function::New(env, callFunction));
  exports.Set(Napi::String::New(env, "virtualAllocEx"), Napi::Function::New(env, virtualAllocEx));
  exports.Set(Napi::String::New(env, "getRegions"), Napi::Function::New(env, getRegions));
  exports.Set(Napi::String::New(env, "virtualQueryEx"), Napi::Function::New(env, virtualQueryEx));
  return exports;
}

NODE_API_MODULE(memoryjs, init)