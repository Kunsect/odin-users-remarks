<p align="left">
    中文&nbsp ｜ &nbsp<a href="README.md">English</a>&nbsp
</p>

# Odin Users' Remarks

允许用户为 [odin.fun](https://odin.fun) 平台上的 holders 添加自定义备注的浏览器扩展，方便识别和记忆 holders，目前已实现以下功能：

- 用户自定义备注
- 导入 / 导出备注数据

![popup page](/screenshot/image1.jpg)

### 安装方法

克隆或下载此仓库到本地

```bash
# 直接使用 plugin/prod 文件夹或者执行以下命令打包
npm install
npm run build
```

在浏览器中加载扩展:

![加载扩展](/screenshot/image2.jpg)

- **Chrome/Edge**: 打开 `chrome://extensions/`，启用"开发者模式"，点击"加载已解压的扩展"，选择 `build/chrome-mv3-dev` 文件夹
- **Firefox**: 打开 `about:debugging`，点击"此 Firefox"，点击"加载临时附加组件"，选择 `build/firefox-mv2-dev` 文件夹中的 manifest.json 文件

### 隐私说明

- 所有备注数据仅存储在您的本地浏览器中
- 扩展不会将任何数据发送到外部服务器
- 扩展仅在 odin.fun 域名下运行

### 免责声明

本扩展不会收集任何用户数据，所有备注数据均保存在用户本地浏览器中，不会上传至任何服务器。

本扩展的开发目的仅为提高用户体验，用户在使用前应自行评估风险，并对自己的操作负责。

### 贡献指南

欢迎提交 Pull Requests 或 Issues 来帮助改进这个扩展。

1. Fork 这个仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

### 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件

### 联系方式

如有问题或建议，请通过以下方式联系我们:

- 在 GitHub 上提交 Issue
- X (Twitter): [@astrabot_ai](https://x.com/astrabot_ai) | [@kunsect7](https://x.com/kunsect7)
