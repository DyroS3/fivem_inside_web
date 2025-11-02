# FiveM ESX 外置网页商城

一个基于 ESX 框架的 FiveM 电商系统，使用外置网页作为商城界面。

## 功能特性

- 外置网页商城界面
- 与 ESX 框架集成
- 商品浏览和购买功能
- 现代化的用户界面

## 安装说明

1. 将此资源放置到您的 FiveM 服务器资源文件夹中
2. 在 `server.cfg` 中添加：
   ```
   ensure fivem_inside_web
   ```
3. 重启服务器

## 依赖项

- ESX Framework (es_extended)

## 文件结构

```
fivem_inside_web/
├── client/          # 客户端脚本
├── server/          # 服务端脚本
├── shop/            # 商城网页文件
├── fxmanifest.lua   # 资源清单
└── package.json     # Node.js 依赖
```

## 技术栈

- FiveM
- ESX Framework
- Node.js
- HTML/CSS/JavaScript

## 许可证

请根据您的需求添加相应的许可证。

## 作者

Your Name

## 版本

2.0.0

