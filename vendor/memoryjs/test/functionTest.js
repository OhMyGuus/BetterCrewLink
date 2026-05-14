const memoryjs = require('../index');
const processName = 'FunctionTest.exe';

// TODO: Start the target process and obtain the absolute address of
// the function that you want to call and update the variable below.

const processObject = memoryjs.openProcess(processName);

const args = [{ type: memoryjs.T_FLOAT, value: 12.34 }];
const returnType = memoryjs.T_FLOAT;

const {
  returnValue,
  exitCode,
} = memoryjs.callFunction(processObject.handle, args, returnType, address);

console.log(`Return value: ${returnValue}`);
console.log(`Exit code: ${exitCode}`);

memoryjs.closeProcess(processObject.handle);
