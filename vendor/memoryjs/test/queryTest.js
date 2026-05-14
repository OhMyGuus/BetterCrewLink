const memoryjs = require('../index');
const processName = 'chrome.exe';

const processObject = memoryjs.openProcess(processName);

const regions = memoryjs.getRegions(processObject.handle).reverse().slice(0, 40);

// Minimum lengths for each column
const lengths = {
  BaseAddress: 'BaseAddress'.length,
  AllocationBase: 'AllocationBase'.length,
  AllocationProtect: 'AllocationProtect'.length,
  RegionSize: 'RegionSize'.length,
  State: 'State'.length,
  Protect: 'Protect'.length,
  Type: 'Type'.length,
  szExeFile: 'szExeFile'.length,
};

// Calculate maximum lengths
regions.forEach((region) => {
  Object.entries(region).forEach(([key, value]) => {
    const formatted = `0x${value.toString(16)}`;
    if (formatted.length > lengths[key]) {
      lengths[key] = formatted.length;
    }
  });
});

let text = '';
Object.entries(lengths).forEach(([key, value]) => {
  if (key === 'szExeFile') {
    text += ` ${key}`.padEnd(value + 2, ' ');
  } else {
    text += key.padStart(value + 2, ' ');
    text += ' |';
  }
});
console.log(text);

regions.forEach((region) => {
  let text = '';
  Object.entries(region).forEach(([key, value]) => {
    if (key === 'szExeFile') {
      text += ` ${value}`.padEnd(lengths[key] + 2, ' ');
    } else {
      text += `0x${value.toString(16)}`.padStart(lengths[key] + 2, ' ');
      text += ' |';
    }
  });

  console.log(text);
});

memoryjs.closeProcess(processObject.handle);
