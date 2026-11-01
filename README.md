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
- 视频中角色卡仅供展示
- 视频中软件在 V1.67 版本下演示，可能和最终效果有偏差
- 软件适用于规则书跑团

## 源码说明

- 根目录：桌面端 WPF 源码
- `mobile/` Android 源码

当前仓库未选择开源许可证，源码可见但未授权开源使用。
手机版构建需要 Android Studio / JDK 17。
## 版权

Copyright (c) 2026 FunnyGold. All rights reserved.

本仓库未采用开源许可证，源码仅用于查看和个人评估。
未经书面许可，不得复制、修改、分发或商用。