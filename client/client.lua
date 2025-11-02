-- ============= ESX 商城 - 客户端脚本 =============
-- 用于处理游戏内通知和交互

ESX = nil

Citizen.CreateThread(function()
    while ESX == nil do
        TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
        Citizen.Wait(0)
    end
end)

-- 打开商城网页
RegisterCommand('shop', function()
    SendNUIMessage({
        type = 'openShop',
        url = 'http://localhost:3000'
    })

    ESX.ShowNotification('~g~商城已打开！~s~ 请在浏览器中查看')
end, false)

-- 显示通知（从服务端触发）
RegisterNetEvent('esx_shop:notify')
AddEventHandler('esx_shop:notify', function(message, type)
    if type == 'success' then
        ESX.ShowNotification('~g~' .. message)
    elseif type == 'error' then
        ESX.ShowNotification('~r~' .. message)
    else
        ESX.ShowNotification(message)
    end
end)

-- 获取玩家标识符（用于网页登录）
RegisterNetEvent('esx_shop:getIdentifier')
AddEventHandler('esx_shop:getIdentifier', function()
    ESX.TriggerServerCallback('esx_shop:getIdentifier', function(identifier)
        print('[商城] 玩家标识符: ' .. identifier)
    end)
end)

print('[商城] 客户端脚本已加载 - 使用 /shop 打开商城')

