# TODO

## Server

- [ ] Migrate from socket.io to a raw websocket connection. Ensure it auto-reconnects.
- [x] Move the default server to a better host.
- [x] Rewrite all error messages to be even more human-readable.
- [ ] Integrate an official server list into the client.
- [x] Detect the reason *why* the server can't provide offsets: i.e. Among Us just updated, it's an old version of Among Us, the server hasn't updated, etc.

### Stretch

- [ ] Distribute the server load, with a centralized matchmaking database.
- [ ] Re-write the server in Rust.

## Voice / WebRTC

- [x] Add a microphone boost slider.
- [x] Add a speaker adjustment slider.
- [x] Add individual adjustment sliders to each of the players.
- [x] Add a OBS Overlay
- [x] Add a Android support
- [] Add a iOS Support 
- [x] Add a option in "Host Settings" Can hear through cams.
- [x] Add a option in "Host Settings" No talking through walls.
- [x] Handle all RTC errors to make it unnecessary to ever re-open an RTC connection.
- [x] Detect reason for RTC failure: NAT type, etc?
- [x] Re-enable all `navigator.getUserMedia` functions that can be re-enabled with autoGainControl kicking in.
- [x] Move all player-to-player communication logic to RTC data channels, versus sending them over the websocket.

### Stretch

- [x] Implement an optional TURN server.

## Game Reader

- [x] Fix unicode characters in player names
- [ ] Indicate to the user when it can't read memory properly. Example: screen displays `MENU` while in lobby due to some misplaced offset.
- [x] Don't use the Unity Analytics file to read the game version. Use either a hash of the GameAssembly dll, or DMA it from the process.

### Stretch

- [ ] Move away from DMA and towards a different method. Probably network packet sniffing? Maybe DLL injection?
- [x] Add itch.io and Linux/Mac support. This will be easiest with packet sniffing.
