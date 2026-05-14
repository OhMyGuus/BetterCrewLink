const memoryjs = require('../index');
const processName = 'Testing Things.exe';

const processObject = memoryjs.openProcess(processName);
const processId = processObject.th32ProcessID;

// Address of variable
const address = 0xEFFBF0;

// When should we breakpoint? On read, write or execute
const trigger = memoryjs.TRIGGER_ACCESS;

memoryjs.attachDebugger(processId);

// There are 4 hardware registers:
// `memoryjs.DR0` through `memoryjs.DR3`
const registerToUse = memoryjs.DR0;

// Our `address` references an integer variable. An integer
// is 4 bytes therefore we pass `4` to the `size` parameter.
const size = 4;
memoryjs.setHardwareBreakpoint(processId, address, registerToUse, trigger, size);

// How long to wait for the debug event before timing out
const timeout = 100;

// The interval duration must be the same or larger than the `timeout` value.
// `awaitDebugEvent` works by waiting a certain amount of time before timing out,
// therefore we only want to call the method again when we're sure the previous
// call has already timed out.
setInterval(() => {
  // `debugEvent` can be null if no event occurred
  const debugEvent = memoryjs.awaitDebugEvent(registerToUse, timeout);

  // If a breakpoint occurred, handle it
  if (debugEvent) {
    memoryjs.handleDebugEvent(debugEvent.processId, debugEvent.threadId);
  }
}, timeout);

// Don't forget to detatch the debugger!
// memoryjs.detatchDebugger(processId);

memoryjs.closeProcess(processObject.handle);
