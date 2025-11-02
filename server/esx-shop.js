// ============= ESX 电商系统 - 服务端 =============
// 集成 ESX 框架，处理商品购买、用户认证、金钱交易

const express = require('express');
const path = require('path');

const app = express();
const PORT = GetConvar('shop_port', '3000');

// ESX 对象
let ESX = null;

// 等待 ESX 加载
TriggerEvent('esx:getSharedObject', (obj) => {
    ESX = obj;
    console.log('[商城] ESX 框架已加载');
});

// 中间件
app.use(express.json());

// CORS 支持 - 允许跨域请求
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.static(GetResourcePath(GetCurrentResourceName()) + '/shop'));

// ============= 商品配置 =============
const SHOP_ITEMS = {
    // 武器类
    weapons: [
        {
            id: 'weapon_pistol',
            name: '手枪',
            description: '标准的 9mm 手枪，适合自卫',
            price: 5000,
            currency: 'money', // money, black_money, bank
            image: '🔫',
            category: 'weapons',
            stock: -1, // -1 表示无限库存
            itemType: 'weapon'
        },
        {
            id: 'weapon_assaultrifle',
            name: '突击步枪',
            description: '强大的自动步枪',
            price: 25000,
            currency: 'black_money',
            image: '🔫',
            category: 'weapons',
            stock: -1,
            itemType: 'weapon'
        }
    ],

    // 物品类
    items: [
        {
            id: 'bread',
            name: '面包',
            description: '恢复少量饥饿值',
            price: 10,
            currency: 'money',
            image: '🍞',
            category: 'food',
            stock: -1,
            itemType: 'item'
        },
        {
            id: 'water',
            name: '矿泉水',
            description: '恢复少量口渴值',
            price: 5,
            currency: 'money',
            image: '💧',
            category: 'food',
            stock: -1,
            itemType: 'item'
        },
        {
            id: 'phone',
            name: '手机',
            description: '用于通讯的智能手机',
            price: 500,
            currency: 'money',
            image: '📱',
            category: 'electronics',
            stock: -1,
            itemType: 'item'
        },
        {
            id: 'lockpick',
            name: '撬锁工具',
            description: '用于开锁',
            price: 150,
            currency: 'black_money',
            image: '🔧',
            category: 'tools',
            stock: -1,
            itemType: 'item'
        }
    ],

    // 载具类
    vehicles: [
        {
            id: 'bmx',
            name: 'BMX 自行车',
            description: '环保的代步工具',
            price: 200,
            currency: 'money',
            image: '🚲',
            category: 'vehicles',
            stock: -1,
            itemType: 'vehicle',
            model: 'bmx'
        },
        {
            id: 'faggio',
            name: 'Faggio 摩托车',
            description: '经济实惠的摩托车',
            price: 2000,
            currency: 'money',
            image: '🛵',
            category: 'vehicles',
            stock: -1,
            itemType: 'vehicle',
            model: 'faggio'
        }
    ]
};

// 将商品列表扁平化
function getAllItems() {
    return [
        ...SHOP_ITEMS.weapons,
        ...SHOP_ITEMS.items,
        ...SHOP_ITEMS.vehicles
    ];
}

// ============= API 路由 =============

// 获取所有商品
app.get('/api/shop/items', (req, res) => {
    try {
        const { category } = req.query;

        let items = getAllItems();

        // 按分类筛选
        if (category && category !== 'all') {
            items = items.filter(item => item.category === category);
        }

        res.json({
            success: true,
            items: items,
            categories: ['all', 'weapons', 'food', 'electronics', 'tools', 'vehicles']
        });
    } catch (error) {
        console.error('[商城] 获取商品列表失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误: ' + error.message
        });
    }
});

// 获取单个商品详情
app.get('/api/shop/items/:id', (req, res) => {
    const { id } = req.params;
    const item = getAllItems().find(i => i.id === id);

    if (!item) {
        return res.status(404).json({
            success: false,
            error: '商品不存在'
        });
    }

    res.json({
        success: true,
        item: item
    });
});

// 获取玩家信息（通过 Steam ID 或 License）
app.get('/api/shop/player/:identifier', async (req, res) => {
    const { identifier } = req.params;

    if (!ESX) {
        return res.status(503).json({
            success: false,
            error: 'ESX 框架未加载'
        });
    }

    try {
        // 查找在线玩家
        const xPlayer = ESX.GetPlayerFromIdentifier(identifier);

        if (!xPlayer) {
            return res.status(404).json({
                success: false,
                error: '玩家不在线或未找到'
            });
        }

        // 获取玩家账户余额
        const accounts = {};
        xPlayer.getAccounts().forEach(account => {
            accounts[account.name] = account.money;
        });

        res.json({
            success: true,
            player: {
                identifier: xPlayer.identifier,
                name: xPlayer.getName(),
                job: xPlayer.getJob().name,
                jobGrade: xPlayer.getJob().grade_label,
                accounts: accounts,
                inventory: xPlayer.getInventory()
            }
        });

    } catch (error) {
        console.error('[商城] 获取玩家信息失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 购买商品
app.post('/api/shop/purchase', async (req, res) => {
    const { identifier, items } = req.body;

    if (!identifier || !items || items.length === 0) {
        return res.status(400).json({
            success: false,
            error: '缺少必要参数'
        });
    }

    if (!ESX) {
        return res.status(503).json({
            success: false,
            error: 'ESX 框架未加载'
        });
    }

    try {
        const xPlayer = ESX.GetPlayerFromIdentifier(identifier);

        if (!xPlayer) {
            return res.status(404).json({
                success: false,
                error: '玩家不在线'
            });
        }

        // 计算总价
        let totalCost = {};
        const purchaseItems = [];

        for (const cartItem of items) {
            const shopItem = getAllItems().find(i => i.id === cartItem.id);

            if (!shopItem) {
                return res.status(404).json({
                    success: false,
                    error: `商品 ${cartItem.id} 不存在`
                });
            }

            const cost = shopItem.price * cartItem.quantity;
            const currency = shopItem.currency;

            if (!totalCost[currency]) {
                totalCost[currency] = 0;
            }
            totalCost[currency] += cost;

            purchaseItems.push({
                ...shopItem,
                quantity: cartItem.quantity,
                totalPrice: cost
            });
        }

        // 检查余额
        for (const [currency, amount] of Object.entries(totalCost)) {
            const account = xPlayer.getAccount(currency);
            if (!account || account.money < amount) {
                return res.status(400).json({
                    success: false,
                    error: `${currency} 余额不足（需要: $${amount}）`
                });
            }
        }

        // 扣除金钱
        for (const [currency, amount] of Object.entries(totalCost)) {
            xPlayer.removeAccountMoney(currency, amount);
        }

        // 给予物品
        for (const item of purchaseItems) {
            if (item.itemType === 'weapon') {
                xPlayer.addWeapon(item.id, 100); // 100 发子弹
            } else if (item.itemType === 'item') {
                xPlayer.addInventoryItem(item.id, item.quantity);
            } else if (item.itemType === 'vehicle') {
                // 载具需要特殊处理（需要配合 esx_vehicleshop 或其他载具系统）
                // 这里简化处理，你可以根据实际需求修改
                TriggerEvent('esx_vehicleshop:setVehicleOwned', xPlayer.identifier, item.model);
            }
        }

        // 发送游戏内通知
        xPlayer.showNotification(`✅ 购买成功！共花费 $${Object.values(totalCost).reduce((a, b) => a + b, 0)}`);

        // 静默处理，购买成功

        res.json({
            success: true,
            message: '购买成功',
            items: purchaseItems,
            totalCost: totalCost
        });

    } catch (error) {
        console.error('[商城] 购买失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取玩家购买历史（可选功能）
app.get('/api/shop/history/:identifier', (req, res) => {
    // 这里可以实现购买历史记录功能
    // 需要配合数据库使用
    res.json({
        success: true,
        history: [],
        message: '购买历史功能待实现'
    });
});

// 健康检查
app.get('/api/shop/health', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        esx: ESX !== null,
        timestamp: Date.now()
    });
});

// 测试端点
app.get('/api/shop/test', (req, res) => {
    const itemCount = getAllItems().length;
    res.json({
        success: true,
        message: '商城 API 运行正常',
        serverTime: new Date().toISOString(),
        itemCount: itemCount,
        esxLoaded: ESX !== null,
        port: PORT
    });
});

// 启动服务器
app.listen(PORT, () => {
    const itemCount = getAllItems().length;
    console.log('[ESX 商城] Web 服务器已启动!');
    console.log(`[ESX 商城] 访问地址: http://localhost:${PORT}`);
    console.log(`[ESX 商城] 商品总数: ${itemCount} 件`);

    if (itemCount === 0) {
        console.error('[ESX 商城] 警告：商品列表为空！');
    }
});

// 资源停止时清理
on('onResourceStop', (resourceName) => {
    if (GetCurrentResourceName() !== resourceName) return;
    console.log('[ESX 商城] 服务器已停止');
});

