fx_version 'cerulean'
game 'gta5'

author 'Your Name'
description 'ESX 电商系统 - 外置网页商城'
version '2.0.0'

-- 服务端脚本
server_script 'server/esx-shop.js'

-- 客户端脚本
client_script 'client/client.lua'

-- Web 静态文件
files {
    'shop/index.html',
    'shop/style.css',
    'shop/app.js'
}

-- ESX 依赖
dependencies {
    'es_extended'
}
