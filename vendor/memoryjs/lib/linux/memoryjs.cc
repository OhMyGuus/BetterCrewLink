#include <napi.h>
#include <cstdlib>
#include "module.h"
#include "process.h"
#include "memoryjs.h"
#include "memory.h"
#include "pattern.h"

process Process;
pattern Pattern;
// module Module;
memory Memory;

struct Vector3
{
  float x, y, z;
};

struct Vector4
{
  float w, x, y, z;
};

Napi::Value openProcess(const Napi::CallbackInfo &args)
{
  Napi::Env env = args.Env();

  if (args.Length() != 1 && args.Length() != 2)
  {
    Napi::Error::New(env, "requires 1 argument, or 2 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsString() && !args[0].IsNumber())
  {
    Napi::Error::New(env, "first argument must be a string or a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 2 && !args[1].IsFunction())
  {
    Napi::Error::New(env, "second argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Define error message that may be set by the function that opens the process
  const char *errorMessage = "";

  pid_t processPid = -1;

  if (args[0].IsString())
  {
    std::string processName(args[0].As<Napi::String>().Utf8Value());
    processPid = Process.openProcess(processName.c_str(), &errorMessage);

    // In case it failed to open, let's keep retrying
    // while(!strcmp(process.szExeFile, "")) {
    //   process = Process.openProcess((char*) *(processName), &errorMessage);
    // };
  }

  if (args[0].IsNumber())
  {
    processPid = args[0].As<Napi::Number>().Uint32Value();

    // In case it failed to open, let's keep retrying
    // while(!strcmp(process.szExeFile, "")) {
    //   process = Process.openProcess(info[0].As<Napi::Number>().Uint32Value(), &errorMessage);
    // };
  }

  // If an error message was returned from the function that opens the process, throw the error.
  // Only throw an error if there is no callback (if there's a callback, the error is passed there).
  if (strcmp(errorMessage, "") && args.Length() != 2)
  {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }
  if (processPid < 0)
  {
    return env.Null();
  }

  // Create a v8 Object (JSON) to store the process information
  Napi::Object processInfo = Napi::Object::New(env);

  processInfo.Set(Napi::String::New(env, "th32ProcessID"), Napi::Value::From(env, processPid));
  processInfo.Set(Napi::String::New(env, "handle"), Napi::Value::From(env, processPid));

  // openProcess can either take one argument or can take
  // two arguments for asychronous use (second argument is the callback)
  if (args.Length() == 2)
  {
    // Callback to let the user handle with the information
    Napi::Function callback = args[1].As<Napi::Function>();
    callback.Call(env.Global(), {Napi::String::New(env, errorMessage), processInfo});
    return env.Null();
  }
  else
  {
    // return JSON
    return processInfo;
  }
}

Napi::Value getProcesses(const Napi::CallbackInfo &args)
{
  Napi::Env env = args.Env();

  if (args.Length() > 1)
  {
    Napi::Error::New(env, "requires either 0 arguments or 1 argument if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 1 && !args[0].IsFunction())
  {
    Napi::Error::New(env, "first argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Define error message that may be set my a function
  const char *errorMessage = "";

  std::vector<process::processStat> processStats = Process.getProcesses(&errorMessage);

  if (strcmp(errorMessage, "") && args.Length() != 1)
  {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array processes = Napi::Array::New(env, processStats.size());

  for (std::vector<pid_t>::size_type i = 0; i != processStats.size(); i++)
  {
    Napi::Object process = Napi::Object::New(env);

    process.Set(Napi::String::New(env, "szExeFile"), Napi::String::From(env, processStats[i].comm));
    process.Set(Napi::String::New(env, "th32ProcessID"), Napi::Value::From(env, processStats[i].pid));

    processes.Set(i, process);
  }

  /* getProcesses can either take no arguments or one argument
     one argument is for asychronous use (the callback) */
  if (args.Length() == 1)
  {
    // Callback to let the user handle with the information
    Napi::Function callback = args[0].As<Napi::Function>();
    callback.Call(env.Global(), {Napi::String::New(env, errorMessage), processes});
    return env.Null();
  }
  else
  {
    // return JSON
    return processes;
  }
}

Napi::Value closeProcess(const Napi::CallbackInfo &args)
{
  Napi::Env env = args.Env();
  return env.Null();
}

Napi::Value findModule(const Napi::CallbackInfo &args)
{
  Napi::Env env = args.Env();

  if (args.Length() != 1 && args.Length() != 2 && args.Length() != 3)
  {
    Napi::Error::New(env, "requires 1 argument, 2 arguments, or 3 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsString() && !args[1].IsNumber())
  {
    Napi::Error::New(env, "first argument must be a string, second argument must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 3 && !args[2].IsFunction())
  {
    Napi::Error::New(env, "third argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string moduleName(args[0].As<Napi::String>().Utf8Value());

  // Define error message that may be set by the function that gets the modules
  const char *errorMessage = "";

  module::Module module = module::findModule(moduleName.c_str(), args[1].As<Napi::Number>().Int32Value(), &errorMessage);

  // If an error message was returned from the function getting the module, throw the error.
  // Only throw an error if there is no callback (if there's a callback, the error is passed there).
  if (strcmp(errorMessage, "") && args.Length() != 3)
  {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  if (module.start == 0)
  {
    return env.Null();
  }

  // Create a v8 Object (JSON) to store the process information
  Napi::Object moduleInfo = Napi::Object::New(env);
  moduleInfo.Set(Napi::String::New(env, "modBaseAddr"), Napi::Value::From(env, module.start));
  moduleInfo.Set(Napi::String::New(env, "szExePath"), Napi::Value::From(env, module.pathname));

  // findModule can either take one or two arguments,
  // three arguments for asychronous use (third argument is the callback)
  if (args.Length() == 3)
  {
    // Callback to let the user handle with the information
    Napi::Function callback = args[2].As<Napi::Function>();
    callback.Call(env.Global(), {Napi::String::New(env, errorMessage), moduleInfo});
    return env.Null();
  }
  else
  {
    // return JSON
    return moduleInfo;
  }
}

Napi::Value findPattern(const Napi::CallbackInfo &args)
{
  Napi::Env env = args.Env();

  // Address of findPattern result
  uintptr_t address = -1;

  // Define error message that may be set by the function that gets the modules
  const char *errorMessage = "";

  pid_t hProcess = (pid_t)args[0].As<Napi::Number>().Int64Value();

  std::vector<module::Module> moduleEntries = module::getModules(hProcess, &errorMessage);

  // If en error message was returned from the function getting the modules, throw the error.
  // Only throw an error if there is no callback (if there's a callback, the error is passed there).
  if (strcmp(errorMessage, "") && args.Length() != 7)
  {
    Napi::Error::New(env, errorMessage).ThrowAsJavaScriptException();
    return env.Null();
  }

  uintptr_t baseAddress = 0;
  for (std::vector<module::Module>::size_type i = 0; i != moduleEntries.size(); i++)
  {
    std::string moduleName(args[1].As<Napi::String>().Utf8Value());

    char *match = strstr(moduleEntries[i].pathname, moduleName.c_str());
    if (match != NULL)
    {
      if (baseAddress == 0)
      {
        baseAddress = moduleEntries[i].start;
      }
      std::string signature(args[2].As<Napi::String>().Utf8Value());

      short sigType = args[3].As<Napi::Number>().Int32Value();
      uint32_t patternOffset = args[4].As<Napi::Number>().Int32Value();
      uint32_t addressOffset = args[5].As<Napi::Number>().Int32Value();
      uint32_t skip = args[6].As<Napi::Number>().Int32Value();

      address = Pattern.findPattern(hProcess, moduleEntries[i], baseAddress, signature.c_str(), sigType, patternOffset, addressOffset, skip);
      if (address != (uintptr_t)-2)
      {
        break;
      }
    }
  }

  // If no error was set by getModules and the address is still the value we set it as, it probably means we couldn't find the module
  if (strcmp(errorMessage, "") && address == (uintptr_t)-1)
    errorMessage = "unable to find module";

  // If no error was set by getModules and the addressis -2 this means there was no match to the pattern
  if (strcmp(errorMessage, "") && address == (uintptr_t)-2)
    errorMessage = "no match found";

  if (args.Length() == 8)
  {
    // Callback to let the user handle the information
    Napi::Function callback = args[7].As<Napi::Function>();
    callback.Call(env.Global(), {Napi::String::New(env, errorMessage), Napi::Value::From(env, address)});
    return env.Null();
  }
  else
  {
    // return JSON
    return Napi::Value::From(env, address);
  }
}

Napi::Value readMemory(const Napi::CallbackInfo &args)
{
  Napi::Env env = args.Env();

  if (args.Length() != 3 && args.Length() != 4)
  {
    Napi::Error::New(env, "requires 3 arguments, or 4 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() && !args[1].IsNumber() && !args[2].IsString())
  {
    Napi::Error::New(env, "first and second argument must be a number, third argument must be a string").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 4 && !args[3].IsFunction())
  {
    Napi::Error::New(env, "fourth argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string dataTypeArg(args[2].As<Napi::String>().Utf8Value());
  const char *dataType = dataTypeArg.c_str();

  // Define the error message that will be set if no data type is recognised
  std::string errorMessage;
  Napi::Value retVal = env.Null();

  pid_t handle = (pid_t)args[0].As<Napi::Number>().Int64Value();
  uintptr_t address = args[1].As<Napi::Number>().Int64Value();

  if (!strcmp(dataType, "byte"))
  {

    unsigned char result = Memory.readMemory<unsigned char>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "int"))
  {

    int result = Memory.readMemory<int>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "int32"))
  {

    int32_t result = Memory.readMemory<int32_t>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "uint32"))
  {

    uint32_t result = Memory.readMemory<uint32_t>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "int64"))
  {

    int64_t result = Memory.readMemory<int64_t>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "uint64"))
  {

    uint64_t result = Memory.readMemory<uint64_t>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "dword"))
  {

    uint32_t result = Memory.readMemory<uint32_t>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "short"))
  {

    short result = Memory.readMemory<short>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "long"))
  {

    long result = Memory.readMemory<long>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "float"))
  {

    float result = Memory.readMemory<float>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "double"))
  {

    double result = Memory.readMemory<double>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "ptr") || !strcmp(dataType, "pointer"))
  {

    intptr_t result = Memory.readMemory<intptr_t>(handle, address);
    retVal = Napi::Value::From(env, result);
  }
  else if (!strcmp(dataType, "bool") || !strcmp(dataType, "boolean"))
  {

    bool result = Memory.readMemory<bool>(handle, address);
    retVal = Napi::Boolean::New(env, result);
  }
  else if (!strcmp(dataType, "string") || !strcmp(dataType, "str"))
  {

    std::vector<char> chars;
    int offset = 0x0;
    while (true)
    {
      char c = Memory.readChar(handle, address + offset);
      chars.push_back(c);

      // break at 1 million chars
      if (offset == (sizeof(char) * 1000000))
      {
        chars.clear();
        break;
      }

      // break at terminator (end of string)
      if (c == '\0')
      {
        break;
      }

      // go to next char
      offset += sizeof(char);
    }

    if (chars.size() == 0)
    {

      if (args.Length() == 4)
        errorMessage = "unable to read string (no null-terminator found after 1 million chars)";
      else
      {
        Napi::Error::New(env, "unable to read string (no null-terminator found after 1 million chars)").ThrowAsJavaScriptException();
        return env.Null();
      }
    }
    else
    {
      // vector -> string
      std::string str(chars.begin(), chars.end());

      retVal = Napi::String::New(env, str.c_str());
    }
  }
  else if (!strcmp(dataType, "vector3") || !strcmp(dataType, "vec3"))
  {

    Vector3 result = Memory.readMemory<Vector3>(handle, address);
    Napi::Object moduleInfo = Napi::Object::New(env);
    moduleInfo.Set(Napi::String::New(env, "x"), Napi::Value::From(env, result.x));
    moduleInfo.Set(Napi::String::New(env, "y"), Napi::Value::From(env, result.y));
    moduleInfo.Set(Napi::String::New(env, "z"), Napi::Value::From(env, result.z));

    retVal = moduleInfo;
  }
  else if (!strcmp(dataType, "vector4") || !strcmp(dataType, "vec4"))
  {

    Vector4 result = Memory.readMemory<Vector4>(handle, address);
    Napi::Object moduleInfo = Napi::Object::New(env);
    moduleInfo.Set(Napi::String::New(env, "w"), Napi::Value::From(env, result.w));
    moduleInfo.Set(Napi::String::New(env, "x"), Napi::Value::From(env, result.x));
    moduleInfo.Set(Napi::String::New(env, "y"), Napi::Value::From(env, result.y));
    moduleInfo.Set(Napi::String::New(env, "z"), Napi::Value::From(env, result.z));

    retVal = moduleInfo;
  }
  else
  {

    if (args.Length() == 4)
      errorMessage = "unexpected data type";
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
      callback.Call(env.Global(), {Napi::String::New(env, errorMessage)});
    else
      callback.Call(env.Global(), {Napi::String::New(env, ""), retVal});
    return env.Null();
  }
  else
  {
    return retVal;
  }
}

Napi::Value readBuffer(const Napi::CallbackInfo &args)
{
  Napi::Env env = args.Env();

  if (args.Length() != 3 && args.Length() != 4)
  {
    Napi::Error::New(env, "requires 3 arguments, or 4 arguments if a callback is being used").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!args[0].IsNumber() && !args[1].IsNumber() && !args[2].IsNumber())
  {
    Napi::Error::New(env, "first, second and third arguments must be a number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (args.Length() == 4 && !args[3].IsFunction())
  {
    Napi::Error::New(env, "fourth argument must be a function").ThrowAsJavaScriptException();
    return env.Null();
  }

  pid_t handle = (pid_t)args[0].As<Napi::Number>().Int64Value();
  uintptr_t address = args[1].As<Napi::Number>().Int64Value();
  size_t size = args[2].As<Napi::Number>().Int64Value();
  char *data = Memory.readBuffer(handle, address, size);
  Napi::Buffer<char> buffer = Napi::Buffer<char>::New(env, data, size);
  // free(data);
  //  delete [] data; // deleting the char array...
  if (args.Length() == 4)
  {
    Napi::Function callback = args[3].As<Napi::Function>();
    callback.Call(env.Global(), {Napi::String::New(env, ""), buffer});
    return env.Null();
  }
  else
  {
    return buffer;
  }
}

Napi::Value writeMemory(const Napi::CallbackInfo &args)
{
  return args.Env().Null();
}

Napi::Value writeBuffer(const Napi::CallbackInfo &args)
{
  return args.Env().Null();
}

Napi::Value virtualProtectEx(const Napi::CallbackInfo &args)
{
  return Napi::Number::From(args.Env(), 0);
}

Napi::Value getProcessPath(const Napi::CallbackInfo &args)
{
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

  pid_t handle = (pid_t)args[0].As<Napi::Number>().Int64Value();
  

  char* path =  module::getFilePath(handle);
  return Napi::String::New(env, path);
  }

Napi::Object init(Napi::Env env, Napi::Object exports)
{
  exports.Set(Napi::String::New(env, "openProcess"), Napi::Function::New(env, openProcess));
  exports.Set(Napi::String::New(env, "getProcesses"), Napi::Function::New(env, getProcesses));
  exports.Set(Napi::String::New(env, "closeProcess"), Napi::Function::New(env, closeProcess));
  exports.Set(Napi::String::New(env, "findModule"), Napi::Function::New(env, findModule));
  exports.Set(Napi::String::New(env, "findPattern"), Napi::Function::New(env, findPattern));
  exports.Set(Napi::String::New(env, "readMemory"), Napi::Function::New(env, readMemory));
  exports.Set(Napi::String::New(env, "readBuffer"), Napi::Function::New(env, readBuffer));
  exports.Set(Napi::String::New(env, "getProcessPath"), Napi::Function::New(env, getProcessPath));
  exports.Set(Napi::String::New(env, "writeMemory"), Napi::Function::New(env, writeMemory));
  exports.Set(Napi::String::New(env, "writeBuffer"), Napi::Function::New(env, writeBuffer));
  exports.Set(Napi::String::New(env, "virtualProtectEx"), Napi::Function::New(env, virtualProtectEx));

  return exports;
}

NODE_API_MODULE(memoryjs, init)
