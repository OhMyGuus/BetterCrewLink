{
  "targets": [
    {
      "target_name": "keywatcher",
      "sources": [
        "src/lib/keywatcher.cpp",
        "src/lib/keyhandler.cpp",
        "src/lib/getkeystate.cpp",
      ],
      'include_dirs': [
        'src/lib'
      ],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")"],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'conditions': [
        ['OS=="win"', {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }],
        ['OS=="mac"', {
          "xcode_settings": {
            "CLANG_CXX_LIBRARY": "libc++",
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'MACOSX_DEPLOYMENT_TARGET': '10.7'
          }
        }],
        ['OS=="linux"', {
            'link_settings': {
                'libraries': [
                    '-lX11'
                ]
          }
        }]
      ]
    }
  ]
}
