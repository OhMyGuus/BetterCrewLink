<!-- DEVELOPMENT -->
## Development

You only need to follow the below instructions if you are trying to modify this software. Otherwise, please download the latest version from the [GitHub releases](https://github.com/OhMyGuus/BetterCrewLink/releases).

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

PC: [![Contributors][contributors-shield]][contributors-url]\
Mobile/Web: [![BetterCrewLink Mobile Contributors](https://img.shields.io/github/contributors/OhMyGuus/BetterCrewlink-mobile?label=Contributors&logo=GitHub)](https://github.com/OhMyGuus/BetterCrewlink-mobile/graphs/contributors)\
Server: [![BetterCrewLink Server Contributors](https://img.shields.io/github/contributors/OhMyGuus/BetterCrewLink-server?label=Contributors&logo=GitHub)](https://github.com/OhMyGuus/BetterCrewLink-server/graphs/contributors)

Any contributions you make are greatly appreciated.

Needed [Git](https://git-scm.com/downloads) for Contributing.

1. [Fork the Project](https://github.com/OhMyGuus/BetterCrewLink/fork).
2. Create your Feature Branch. (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes. (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch. (`git push origin feature/AmazingFeature`)
5. Open a Pull Request.


### Translating

[![Crowdin][crowdin-shield]][crowdin-url]

BetterCrewLink now officially supports other languages, that is, you can use BetterCrewLink without any problem of not understanding a part in English, but with that we need help with translations because nobody is born knowing everything languages.

Any translations you make are greatly appreciated.

There are two methods.

<details>
<summary> In Crowdin </summary>

1. [Go to Crowdin Page](https://crwd.in/bettercrewlink).
2. Search for the name of your language you want to translate.
3. Click on it and start translating.

</details>

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


[contributors-shield]: https://img.shields.io/github/contributors/OhMyGuus/BetterCrewLink?label=Contributors&logo=GitHub
[contributors-url]: https://github.com/OhMyGuus/BetterCrewLink/graphs/contributors
[crowdin-shield]: https://badges.crowdin.net/bettercrewlink/localized.svg
[crowdin-url]: https://crowdin.com/project/bettercrewlink
