import { EventEmitter } from "events";

const lib: AddonExports = require("bindings")("keywatcher");
interface AddonExports {
  start(cb: (e: any) => void) : void;
  addKeyHook(keyId: number) : void;
  clearKeyHooks() : void;
}

declare interface KeyboardWatcher {
  on(event: 'keydown', listener: (keyId: number) => void): this
  on(event: 'keyup', listener: (keyId: number) => void): this

}

class KeyboardWatcher extends EventEmitter {
  constructor() {
    super();
  }

  addKeyHook(keyId: number){
    lib.addKeyHook(keyId);
  }
  clearKeyHooks(){
    lib.clearKeyHooks();
  }

  start() {
    lib.start(this.emit.bind(this));
  }
}

export const keyboardWatcher = new KeyboardWatcher();
