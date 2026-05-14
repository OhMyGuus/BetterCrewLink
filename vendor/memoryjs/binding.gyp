{
   "targets":[
      {
         "target_name":"memoryjs",
         "include_dirs":[
            "<!@(node -p \"require('node-addon-api').include\")"
         ],
         "conditions":[
            [
               'OS=="linux"',
               {
                  "sources":[
                     "lib/linux/memoryjs.cc",
                     "lib/linux/memory.cc",
                     "lib/linux/process.cc",
                     "lib/linux/module.cc",
                     "lib/linux/pattern.cc"
                  ]
               }
            ],
            [
               'OS=="win"',
               {
                  "sources":[
                  "lib/windows/memoryjs.cc",
                  "lib/windows/memory.cc",
                  "lib/windows/process.cc",
                  "lib/windows/module.cc",
                  "lib/windows/pattern.cc",
                  "lib/windows/functions.cc"
                  ]
               }
            ]
         ],
         "defines":[
            "NAPI_DISABLE_CPP_EXCEPTIONS"
         ],
         "msvs_settings": {
            "VCCLCompilerTool": {
               "AdditionalOptions": [
                  "/Zc:strictStrings-"
               ],
               "ForcedIncludeFiles": [
                  "<(module_root_dir)/lib/windows/v8-msvc-compat.h"
               ]
            }
         }
      }
   ]
}
