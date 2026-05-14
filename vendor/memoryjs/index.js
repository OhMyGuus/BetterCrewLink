const memoryjs = require('./build/Release/memoryjs');

module.exports = {
  // data type constants
  BYTE: 'byte',
  INT: 'int',
  INT32: 'int32',
  UINT32: 'uint32',
  INT64: 'int64',
  UINT64: 'uint64',
  DWORD: 'dword',
  SHORT: 'short',
  LONG: 'long',
  FLOAT: 'float',
  DOUBLE: 'double',
  BOOL: 'bool',
  BOOLEAN: 'boolean',
  PTR: 'ptr',
  POINTER: 'pointer',
  STR: 'str',
  STRING: 'string',
  VEC3: 'vec3',
  VECTOR3: 'vector3',
  VEC4: 'vec4',
  VECTOR4: 'vector4',

  // signature type constants
  NORMAL: 0x0,
  READ: 0x1,
  SUBTRACT: 0x2,

  // function data type constants
  T_VOID: 0x0,
  T_STRING: 0x1,
  T_CHAR: 0x2,
  T_BOOL: 0x3,
  T_INT: 0x4,
  T_DOUBLE: 0x5,
  T_FLOAT: 0x6,

    // Memory access types.
  // See: https://docs.microsoft.com/en-gb/windows/desktop/Memory/memory-protection-constants
  PAGE_NOACCESS: 0x01,
  PAGE_READONLY: 0x02,
  PAGE_READWRITE: 0x04,
  PAGE_WRITECOPY: 0x08,
  PAGE_EXECUTE: 0x10,
  PAGE_EXECUTE_READ: 0x20,
  PAGE_EXECUTE_READWRITE: 0x40,
  PAGE_EXECUTE_WRITECOPY: 0x80,
  PAGE_GUARD: 0x100,
  PAGE_NOCACHE: 0x200,
  PAGE_WRITECOMBINE: 0x400,
  PAGE_ENCLAVE_UNVALIDATED: 0x20000000,
  PAGE_TARGETS_NO_UPDATE: 0x40000000,
  PAGE_TARGETS_INVALID: 0x40000000,
  PAGE_ENCLAVE_THREAD_CONTROL: 0x80000000,

    // Memory allocation types.
  // See: https://docs.microsoft.com/en-us/windows/desktop/api/memoryapi/nf-memoryapi-virtualallocex
  MEM_COMMIT: 0x00001000,
  MEM_RESERVE: 0x00002000,
  MEM_RESET: 0x00080000,
  MEM_TOP_DOWN: 0x00100000,
  MEM_RESET_UNDO: 0x1000000,
  MEM_LARGE_PAGES: 0x20000000,
  MEM_PHYSICAL: 0x00400000,

  openProcess(processIdentifier, callback) {
    if (arguments.length === 1) {
      return memoryjs.openProcess(processIdentifier);
    }

    memoryjs.openProcess(processIdentifier, callback);
  },

  getProcesses(callback) {
    if (arguments.length === 0) {
      return memoryjs.getProcesses();
    }

    memoryjs.getProcesses(callback);
  },

  findModule(moduleName, processId, callback) {
    if (arguments.length === 2) {
      return memoryjs.findModule(moduleName, processId);
    }

    memoryjs.findModule(moduleName, processId, callback);
  },

  readMemory(handle, address, dataType, callback) {
    if (arguments.length === 3) {
      return memoryjs.readMemory(handle, address, dataType.toLowerCase());
    }

    memoryjs.readMemory(handle, address, dataType.toLowerCase(), callback);
  },

  readBuffer(handle, address, size, callback) {
    if (arguments.length === 3) {
      return memoryjs.readBuffer(handle, address, size);
    }

    memoryjs.readBuffer(handle, address, size, callback);
  },

  getProcessPath(handle) {
      return memoryjs.getProcessPath(handle);
  },

  virtualAllocEx(handle, address, size, allocationType, protection, callback) {
    if (arguments.length === 5) {
      return memoryjs.virtualAllocEx(handle, address, size, allocationType, protection);
    }

    memoryjs.virtualAllocEx(handle, address, size, allocationType, protection, callback);
  },

  writeMemory(handle, address, value, dataType) {
    if (dataType === 'str' || dataType === 'string') {
      value += '\0'; // add terminator
    }

    return memoryjs.writeMemory(handle, address, value, dataType.toLowerCase());
  },

  writeBuffer(handle, address, buffer) {
    return memoryjs.writeBuffer(handle, address, buffer);
  },

  findPattern(handle, moduleName, signature, signatureType, patternOffset, addressOffset, skip = 0, callback) {
    if (arguments.length === 6 || arguments.length === 7) {
      return memoryjs.findPattern(handle, moduleName, signature, signatureType, patternOffset, addressOffset, skip);
    }

    memoryjs.findPattern(handle, moduleName, signature, signatureType, patternOffset, addressOffset, callback);
  },

  closeProcess: memoryjs.closeProcess, // nop
};
