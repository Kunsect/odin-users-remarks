<p align="left">
    <a href="README_zh.md">中文</a>&nbsp ｜ &nbspEnglish&nbsp
</p>

# Odin Users' Remarks

A browser extension that allows users to add custom notes for holders on the [odin.fun](https://odin.fun) platform, making it easier to identify and remember holders. Currently implemented features include:

- Custom user remarks
- Import/Export remarks data

![popup page](/screenshot/image1.jpg)

## Installation

Clone or download this repository to your local machine

```bash
# Either use the plugin/prod folder directly or run the following commands to build
npm install
npm run build
```

Load the extension in your browser:

![Load extension](/screenshot/image2.jpg)

- **Chrome/Edge**: Open `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the `build/chrome-mv3-dev` folder
- **Firefox**: Open `about:debugging`, click "This Firefox", click "Load Temporary Add-on", and select the manifest.json file in the `build/firefox-mv2-dev` folder

## Privacy Statement

- All note data is stored only in your local browser
- The extension does not send any data to external servers
- The extension only runs on the odin.fun domain

## Disclaimer

This extension does not collect any user data. All note data is saved in the user's local browser and is not uploaded to any server.

The purpose of developing this extension is solely to improve user experience. Users should assess the risks themselves before using it and are responsible for their own actions.

## Contribution Guidelines

Pull Requests or Issues are welcome to help improve this extension.

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Contact

If you have any questions or suggestions, please contact us through:

- Submit an Issue on GitHub
- X (Twitter): [@astrabot_ai](https://x.com/astrabot_ai) | [@kunsect7](https://x.com/kunsect7)
