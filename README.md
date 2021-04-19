[![GitHub Downloads][downloads-shield]][downloads-url] [![GitHub Downloads Latest Release][downloads_latest_release-shield]][downloads_latest_release-url] [![GitHub Latest Release][latest_release-shield]][latest_release-url] [![GPL-3.0 License][license-shield]][license-url] [![GitHub Actions Build][github_actions-shield]][github_actions-url] [![BetterCrewLink Voice Server Status][status-shield]][status-url] [![BetterCrewLink Voice Server Uptime][uptime-shield]][uptime-url] [![Support BetterCrewLink][paypal-shield]][paypal-url] [![Support BetterCrewLink][kofi-shield]][kofi-url] [![Discord Server][discord-shield]][discord-url] [![Contributors][contributors-shield]][contributors-url] [![Crowdin][crowdin-shield]][crowdin-url]

<br />
<p align="center">
  <a href="https://github.com/OhMyGuus/BetterCrewLink">
    <img src="logo.png" alt="Logo" width="80" height="80">
  </a>
  <h3 align="center">BetterCrewLink a CrewLink fork with extra features & better support</h3>


  <p align="center">
    Free, open, Among Us proximity voice chat.
    <br />
    <a href="https://github.com/OhMyGuus/BetterCrewLink/issues">Report Bug</a>
    ·
    <a href="https://github.com/OhMyGuus/BetterCrewLink/issues">Request Feature</a>
    ·
    <a href="#installation">Installation Instructions</a>
  </p>
  <p align="center">
    <b><a href="https://www.paypal.com/donate?hosted_button_id=KS43BDTGN76JQ">Donate to BetterCrewLink</a></b></br>
  (all donations will be used for the apple developer license and extra servers)</br>
   <b><a href="https://paypal.me/ottomated">Donate to ottomated (official CrewLink)</a></b>
  </p>
</p>
<hr />

<p>

<!-- NOTES -->
<b>Notes:</b><br />

- This is an unofficial fork of CrewLink, for any problem, question, issue or suggestion you have with BetterCrewLink talk to us on our [Discord](https://discord.gg/qDqTzvj4SH), or [GitHub](https://github.com/OhMyGuus/BetterCrewLink/issues) or message me on Discord ([ThaGuus#2140](https://discordapp.com/users/508426414387757057)) do not report any problems to the official Discord or GitHub project of CrewLink as they will not support you.

- To get the most of BetterCrewLink use the voice server: <a href="https://bettercrewl.ink">`https://bettercrewl.ink`</a>

<div>
  <a target="_blank" href="https://discord.gg/qDqTzvj4SH" title="Join our Discord!">
    <img height="75px" draggable="false" src="https://discordapp.com/api/guilds/791516611143270410/widget.png?style=banner2" alt="Join our Discord!">
  </a>
</div>

<!-- TABLE OF CONTENTS -->
## Table of Contents

* [Extra features/fixes in this fork](#extra-featuresfixes-in-this-fork)
* [About the Project](#about-the-project)
* [Installation](#installation)
  * [Windows](#windows)
  * [Linux](#linux)
  * [Android & Chromebook](#android--chromebook)
  * [iOS & macOS](#ios--macos)
* [Development](#development)
  * [Prerequisites](#prerequisites)
  * [Setup](#setup)
* [Contributing](#contributing)
* [Translating](#translating)
  * [Contributors](#contributors)
* [License](#license)

<!-- EXTRA FEATURES-->
## Extra features/fixes in this fork
```
- OBS Browsersource Overlay.
- Hear People in Vision Only.
- Walls Block Audio. 
- Volume Sliders.
- It doesn't break when someone leaves/disconnects.
- It works on any network even with UPnP disabled. (Strict NAT)
- More fun settings like hearing through cameras, impostor radio.
- You can actually disable the overlay.
- 32bit support, Windows 7 support.
- You can change the volume of alive players after you died.
- You can set BetterCrewLink to topmost.
- Settings actually sync between players and not half.
- CPU usage is lower than original CrewLink.
- You can actually press the mute key/deafen key while clicked on BetterCrewLink.
- Your mouse doesn't start to lag because of the buggy input hook.
- Changing the speaker setting does actually something unlike original CrewLink where it is always using the default output.
- Compatible with CrewLink 2.0 
- Microphone Echo Cancellation.
- Microphone Eoise Suppression.
- More overlay positions and you can set the overlay to the top/bottom and you can set it so it shows everyone even when they aren't talking.
- You can set the lobby up so only death people can talk. (normal lobbies but then with death talk)
- Support for new versions of Among Us. (v2021.3.31.3 and v2021.4.1)
- Support for Custom Colors. (mods that add more colors)
- Support for Linux.
- Support for Mobile.
```

**If I missed something you can join in [Discord server](https://discord.gg/qDqTzvj4SH), or in [GitHub](https://github.com/OhMyGuus/BetterCrewLink/issues) or DM me on Discord ([ThaGuus#2140](https://discordapp.com/users/508426414387757057)) it so I can add it**

<!-- ABOUT THE PROJECT -->
## About The Project

This project implements proximity voice chat in Among Us. Everyone in an Among Us lobby with this program running will be able to communicate over voice in-game, with no third-party programs required. Spatial audio ensures that you can only hear people close to you.

<!-- INSTALLATION -->
## Installation

### Windows

Download the latest version from [releases](https://github.com/OhMyGuus/BetterCrewLink/releases/latest) and run the `BetterCrewLink-Setup-X.X.X.exe` file. You may get antivirus warnings, because this program hooks into the Among Us process to read game data.

[![GitHub Latest Release][latest_release-shield]][latest_release-url]

[![Setup Video](https://img.youtube.com/vi/_8F4f5iQEIc/0.jpg)](https://www.youtube.com/watch?v=_8F4f5iQEIc "BetterCrewLink Setup Instructions")

### Linux

To install & run it on Linux run the following commands:

```
wget "https://mirror.bettercrewl.ink/pc/latest/BetterCrewlink-Linux.AppImage"
chmod +x BetterCrewlink-Linux.AppImage
echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
./BetterCrewlink-Linux.AppImage
```

The Linux version is thanks to the following contributors:

- [TheGreatMcPain](https://github.com/TheGreatMcPain) -> CrewLink fork, Keyboard watcher fork, Memoryjs fork
- [zbanks](https://github.com/zbanks) -> Memoryjs fork
- [Donokami](https://github.com/Donokami) -> Testing and helping  

### Android & Chromebook

Go to category [Installation](https://github.com/OhMyGuus/BetterCrewlink-mobile#installation) in BetterCrewlink-mobile to see how to install the Android/Chromebook version. (requires a PC player)

[![BetterCrewLink Play Store](https://lh3.googleusercontent.com/cjsqrWQKJQp9RFO7-hJ9AfpKzbUb_Y84vXfjlP0iRHBvladwAfXih984olktDhPnFqyZ0nu9A5jvFwOEQPXzv7hr3ce3QVsLN8kQ2Ao=s0)](https://play.google.com/store/apps/details?id=io.bettercrewlink.app "Get BetterCrewLink on Play Store")

### iOS & macOS

An iOS/macOS version is still being developed and will be released soon but you can use the [web version](https://web.bettercrewl.ink/). (requires a PC player)

<!-- DEVELOPMENT -->
## Development

You only need to follow the below instructions if you are trying to modify this software. Otherwise, please download the latest version from the [github releases](https://github.com/OhMyGuus/BetterCrewLink/releases).

Server code is located at [OhMyGuus/BetterCrewLink-server](https://github.com/OhMyGuus/BetterCrewLink-server). Please use a local server for development purposes.

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* [Python](https://www.python.org/downloads/)
* [node.js](https://nodejs.org/en/download/)
* yarn
```sh
npm install yarn -g
```

### Setup

1. Clone the repo
```sh
git clone https://github.com/OhMyGuus/BetterCrewLink.git
cd BetterCrewLink
```
2. Install NPM packages
```sh
yarn install
```
3. Run the project
```JS
yarn dev
```

<!-- CONTRIBUTING -->
## Contributing

Any contributions you make are greatly appreciated.

1. [Fork the Project](https://github.com/OhMyGuus/BetterCrewLink/fork).
2. Create your Feature Branch. (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes. (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch. (`git push origin feature/AmazingFeature`)
5. Open a Pull Request.

### Translating

[![Crowdin][crowdin-shield]][crowdin-url]

BetterCrewLink now officially supports other languages, that is, you can use BetterCrewLink without any problem of not understanding a part in English, but with that we need help with translations because nobody is born knowing everything languages.

Any translations you make are greatly appreciated.

There are two methods for this:

<details>
<summary> In GitHub </summary>

1. [Fork the Project](https://github.com/OhMyGuus/BetterCrewLink/fork).
2. Create your Translation Branch.
3. Go to static **->** locales **->** en **->** translation.json and Download this file.
4. Open the translation.json with your text editor of preference.
5. Edit the file but not edit this parts like: "gamehostonly", "inlobbyonly", just translate the text.
6. Create a folder with the acronym of your language that you translated with translation.json inside the folder.
7. Throw everything to your fork.
8. Open a Pull Request.

</details>

<details>
<summary> In Crowdin </summary>

1. [Go to Crowdin Page](https://crowdin.com/project/bettercrewlink).
2. Search for the name of your language you want to translate.
3. Click on it and start translating.

</details>

### Contributors

<details>
<summary> BetterCrewLink Contributors </summary>

[![Contributors][contributors-shield]][contributors-url] [![Crowdin][crowdin-shield]][crowdin-url]

* [OhMyGuus](https://github.com/OhMyGuus) for make various things for [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink), example: NAT Fix, more overlays, support for Mobile and owner of project
* [ottomated](https://github.com/ottomated) for make [CrewLink](https://github.com/ottomated/CrewLink)
* [vrnagy](https://github.com/vrnagy) for make WebRTC reconnects automatically for [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink)
* [TheGreatMcPain](https://github.com/TheGreatMcPain) & [Donokami](https://github.com/Donokami) for make support for Linux
* [squarebracket](https://github.com/squarebracket) for make support overlay for Linux
* [JKohlman](https://github.com/JKohlman) for make various things for [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink), example: push to mute, visual changes and making Multi Stage builds for [BetterCrewLink Server](https://github.com/OhMyGuus/BetterCrewLink-server)
* [Diemo-zz](https://github.com/Diemo-zz) for make the default Voice Server for [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink): <a href="https://bettercrewl.ink">`https://bettercrewl.ink`</a>
* [KadenBiel](https://github.com/KadenBiel) for make various things for [BetterCrewLink Mobile](https://github.com/OhMyGuus/BetterCrewlink-mobile), example: Better UI, Settings page, translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to German
* [adofou](https://github.com/adofou) for make new parameters for node-turn server for [BetterCrewLink-Server](https://github.com/OhMyGuus/BetterCrewLink-server) and translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to French
* [Kore-Development](https://github.com/Kore-Development) for make support for Repl.it and gitignore changes for [BetterCrewLink-Server](https://github.com/OhMyGuus/BetterCrewLink-server)
* [cybershard](https://github.com/cybershard) & [edqx](https://github.com/edqx) for make Only hear people in vision, Walls block voice and Hear through cameras
* [electron-overlay-window](https://github.com/SnosMe/electron-overlay-window) for make it easier to do overlays
* [node-keyboard-watcher](https://github.com/OhMyGuus/node-keyboard-watcher) for make it easy to push to talk and push to mute
* [MatadorProBr](https://github.com/MatadorProBr) for make this list of Contribuators, better README.md, wiki, translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Portuguese (Brazil)
* [LukehTM](https://github.com/LukehTM) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Spanish
* [KaldonM](https://github.com/KaldonM) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Slovak
* [vb-03](https://github.com/vb-03) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Portuguese (Portugal)
* [LaneGL](https://github.com/LaneGL) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Indonesian
* [SirBuvex](https://github.com/SirBuvex) & [Jeddunk](https://github.com/jeddunk) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to German
* [Steby5](https://github.com/Steby5) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Slovenian and Slovak
* [XRevan86](https://github.com/XRevan86) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Russian and Ukrainian
* [Ajno, Jano Miĥalako](https://crowdin.com/profile/Ajno) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Esperanto
* [Tiquis#2659](https://discordapp.com/users/395290180124278787) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Czech
* [ElBusAlv](https://github.com/ElBusAlv) & [nyanya4444](https://github.com/nyanya4444) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Catalan
* [Achs gaming](https://crowdin.com/profile/Achsan4) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Arabic and Arabic Egpyt
* [Fixuuu](https://github.com/Fixuuu) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Polish
* [canicjusz](https://github.com/canicjusz) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Esperanto and Polish
* [Hani Rouatbi](https://crowdin.com/profile/lamjed001) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Arabic
* [NoikzGaming](https://crowdin.com/profile/NoikzGaming) for translate [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) to Swedish

A big thank you to all those people who contributed and still contribute to this project to stay alive, thank you so much for being part of this BetterCrewLink community!

</details>

<!-- LICENSE -->
## License

Distributed under the GNU General Public License v3.0. See <a href="https://github.com/OhMyGuus/BetterCrewLink/blob/nightly/LICENSE">`LICENSE`</a> for more information.

[downloads-shield]: https://img.shields.io/github/downloads/OhMyGuus/BetterCrewLink/total?logo=GitHub&label=Downloads
[downloads-url]: https://github.com/OhMyGuus/BetterCrewLink/releases/
[downloads_latest_release-shield]: https://img.shields.io/github/downloads/OhMyGuus/BetterCrewLink/latest/total?label=Downloads%20%28latest%20release%29&logo=GitHub
[downloads_latest_release-url]: https://github.com/OhMyGuus/BetterCrewLink/releases/latest/
[latest_release-shield]: https://img.shields.io/github/v/release/OhMyGuus/BetterCrewLink?logo=GitHub&color=success&label=Latest%20Release
[latest_release-url]: https://github.com/OhMyGuus/BetterCrewLink/releases/latest/
[license-shield]: https://img.shields.io/github/license/OhMyGuus/BetterCrewLink?label=License
[license-url]: https://github.com/OhMyGuus/BetterCrewLink/blob/nightly/LICENSE
[github_actions-shield]: https://img.shields.io/github/workflow/status/OhMyGuus/BetterCrewLink/BetterCrewLink%20Build%20(CI)?label=Build%20%28CI%29&logo=GitHub
[github_actions-url]: https://github.com/OhMyGuus/BetterCrewLink/actions
[status-shield]: https://img.shields.io/nodeping/status/d05ourk4-xif3-4x57-83ro-59qr0yr5j33l?down_message=Offline&label=Status&up_message=Online
[status-url]: https://bettercrewl.ink/
[uptime-shield]: https://img.shields.io/nodeping/uptime/d05ourk4-xif3-4x57-83ro-59qr0yr5j33l?label=Uptime
[uptime-url]: https://bettercrewl.ink/
[paypal-shield]: https://img.shields.io/badge/Support-BetterCrewLink-purple?logo=PayPal
[paypal-url]: https://www.paypal.com/donate?hosted_button_id=KS43BDTGN76JQ
[kofi-shield]: https://img.shields.io/badge/Support-BetterCrewLink-purple?logo=Ko-fi&logoColor=white
[kofi-url]: https://ko-fi.com/ohmyguus
[discord-shield]: https://img.shields.io/discord/791516611143270410?color=cornflowerblue&label=Discord&logo=Discord&logoColor=white
[discord-url]: https://discord.gg/qDqTzvj4SH
[contributors-shield]: https://img.shields.io/github/contributors/OhMyGuus/BetterCrewLink?label=Contributors&logo=GitHub
[contributors-url]: https://github.com/OhMyGuus/BetterCrewLink/graphs/contributors
[crowdin-shield]: https://badges.crowdin.net/bettercrewlink/localized.svg
[crowdin-url]: https://crowdin.com/project/bettercrewlink
