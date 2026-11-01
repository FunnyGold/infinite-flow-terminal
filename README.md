# 无限流跑团角色终端

一个本地离线的无限流跑团终端。

## 下载

最新版本请到 Releases：

https://github.com/FunnyGold/infinite-flow-terminal/releases

- Windows：InfiniteFlowTerminal-V1.67-Windows.zip
- Android：InfiniteFlowTerminal-Android-v0.2.36.apk

## 功能

- 角色卡
- 规则书 / CHM 检索
- 战斗 / 攻击预设
- 资源 / 购买清单
- 收支账本
- ST 工具 / 同屏结算
- Windows / Android

## 开发

需要 .NET 10 SDK 和 WebView2 Runtime。

```powershell
dotnet build
```

## 说明

- 本地离线，无需账号
- 不包含第三方 CHM 规则书，请自行准备
- 软件适用于规则书跑团

## 源码说明

- 根目录：桌面端 WPF 源码
- `mobile/` Android 源码

手机版构建需要 Android Studio / JDK 17。

## License

MIT License

Copyright (c) 2026 FunnyGold

本项目代码采用 MIT License。第三方组件仍遵守其各自许可证，详见 `THIRD_PARTY_NOTICES.md`。