const memoryjs = require('../index');
const processName = 'ProtectionTest.exe';

// TODO: Start the TestTarget process, and monitor it's return value.

const processObject = memoryjs.openProcess(processName);
console.log(processObject);

memoryjs.setProtection(processObject.handle, 0x00FE102D, 4, memoryjs.PAGE_EXECUTE_READWRITE);
memoryjs.writeMemory(processObject.handle, 0x00FE102D, 1337, memoryjs.INT);

memoryjs.closeProcess(processObject.handle);
