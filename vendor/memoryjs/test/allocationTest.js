const memoryjs = require('../index');
const processName = 'notepad.exe';

const processObject = memoryjs.openProcess(processName);

const address = memoryjs.virtualAllocEx(
  processObject.handle,
  null,
  0x60,
  memoryjs.MEM_RESERVE | memoryjs.MEM_COMMIT,
  memoryjs.PAGE_EXECUTE_READWRITE,
);

console.log(`Allocated address: 0x${address.toString(16).toUpperCase()}`);

memoryjs.closeProcess(processObject.handle);
