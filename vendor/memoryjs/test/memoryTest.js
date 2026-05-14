const memoryjs = require('../index');
const processName = 'MemoryTest.exe';

// TODO: Start the MemoryTest process, and check it's output against the outputs of this

/* Example Output:

$ node test/memoryTest
type    address         value
int     0x3AFCB4        2003818640
dword   0x3AFCA8        2648673792
short   0x3AFC9C        0
long    0x3AFC90        0
float   0x3AFC84        0
double  0x3AFC74        4.031792002834e-312
pointer 0x3AFC68        816043786240
bool    0x3AFC5F        false
string  0xB1FAA4        robert
*/

const processObject = memoryjs.openProcess(processName);

const data = [{
  type: memoryjs.INT,
  name: 'int',
  address: 0x003AFCB4,
}, {
  type: memoryjs.DWORD,
  name: 'dword',
  address: 0x003AFCA8,
}, {
  type: memoryjs.SHORT,
  name: 'short',
  address: 0x003AFC9C,
}, {
  type: memoryjs.LONG,
  name: 'long',
  address: 0x003AFC90,
}, {
  type: memoryjs.FLOAT,
  name: 'float',
  address: 0x003AFC84,
}, {
  type: memoryjs.DOUBLE,
  name: 'double',
  address: 0x003AFC74,
}, {
  type: memoryjs.POINTER,
  name: 'pointer',
  address: 0x003AFC68,
}, {
  type: memoryjs.BOOL,
  name: 'bool',
  address: 0x003AFC5F,
}, {
  type: memoryjs.STRING,
  name: 'string',
  address: 0xb1faa4,
}];

console.log('type\taddress\t\tvalue');

data.forEach(({ type, name, address }) => {
  const result = memoryjs.readMemory(processObject.handle, address, type);
  console.log(`${name}\t0x${address.toString(16).toUpperCase()}\t${result}`);
});

memoryjs.closeProcess(processObject.handle);
