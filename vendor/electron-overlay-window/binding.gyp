{
  'targets': [
    {
      'target_name': 'overlay_window',
      'sources': [
        'src/lib/addon.c',
        'src/lib/napi_helpers.c'
      ],
      'include_dirs': [
        'src/lib'
      ],
      'conditions': [
        ['OS=="win"', {
          'defines': [
            'WIN32_LEAN_AND_MEAN'
          ],
          'link_settings': {
            'libraries': [
              'oleacc.lib'
            ]
          },
      	  'sources': [
            'src/lib/windows.c',
          ]
      	}],
        ['OS=="linux"', {
          'defines': [
            '_GNU_SOURCE'
          ],
          'link_settings': {
            'libraries': [
              '-lxcb', '-lpthread'
            ]
          },
          'cflags': ['-std=c99', '-pedantic', '-Wall', '-pthread'],
      	  'sources': [
            'src/lib/x11.c',
          ]
      	}]
      ]
    }
  ]
}