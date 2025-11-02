// ============= ESX 商城 - Vue.js 3 应用 =============

const { createApp } = Vue;

createApp({
    data() {
        return {
            // 用户相关
            currentUser: null,
            loginIdentifier: '',
            showLoginModal: false,

            // 商品相关
            allItems: [],
            filteredItems: [],
            selectedItem: null,
            loading: true,
            searchQuery: '',
            sortBy: 'default',

            // 分类相关
            currentCategory: 'all',
            categories: [
                { id: 'all', name: '全部商品', icon: 'bi-grid' },
                { id: 'weapons', name: '武器装备', icon: 'bi-crosshair' },
                { id: 'food', name: '食物饮料', icon: 'bi-egg-fried' },
                { id: 'electronics', name: '电子产品', icon: 'bi-phone' },
                { id: 'tools', name: '工具道具', icon: 'bi-tools' },
                { id: 'vehicles', name: '载具车辆', icon: 'bi-car-front' }
            ],

            // 筛选相关
            priceRange: [0, 1000000],
            currencyFilter: {
                money: true,
                black_money: true
            },

            // 购物车相关
            cart: [],
            showCartSidebar: false,
            showDetailModal: false,

            // 通知相关
            toasts: []
        };
    },

    computed: {
        // 购物车商品数量
        cartItemCount() {
            return this.cart.reduce((sum, item) => sum + item.quantity, 0);
        },

        // 总价（现金）
        totalMoney() {
            return this.cart
                .filter(item => item.currency === 'money')
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        },

        // 总价（黑钱）
        totalBlackMoney() {
            return this.cart
                .filter(item => item.currency === 'black_money')
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
    },

    mounted() {
        // 初始化 AOS 动画
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true
            });
        }

        // 加载商品
        this.loadItems();

        // 恢复用户信息
        this.restoreUser();

        // 恢复购物车
        this.restoreCart();
    },

    methods: {
        // ============= 商品相关 =============
        async loadItems() {
            try {
                this.loading = true;
                const response = await fetch('/api/shop/items');

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success && data.items) {
                    this.allItems = data.items;

                    // 强制触发筛选（确保首次加载时显示）
                    this.$nextTick(() => {
                        this.filterItems();
                    });

                    if (this.allItems.length === 0) {
                        this.showToast('商品列表为空', 'warning');
                    }
                } else {
                    this.showToast('数据格式错误', 'danger');
                }
            } catch (error) {
                console.error('加载商品失败:', error);
                this.showToast('无法连接到服务器', 'danger');
            } finally {
                this.loading = false;
            }
        },

        filterItems() {
            // 如果没有商品数据，直接返回
            if (!this.allItems || this.allItems.length === 0) {
                this.filteredItems = [];
                return;
            }

            let items = [...this.allItems];

            // 分类筛选
            if (this.currentCategory !== 'all') {
                items = items.filter(item => item.category === this.currentCategory);
            }

            // 价格筛选
            items = items.filter(item =>
                item.price >= this.priceRange[0] && item.price <= this.priceRange[1]
            );

            // 货币类型筛选
            items = items.filter(item => this.currencyFilter[item.currency]);

            // 搜索筛选
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                items = items.filter(item =>
                    item.name.toLowerCase().includes(query) ||
                    item.description.toLowerCase().includes(query)
                );
            }

            this.filteredItems = items;
            this.sortItems();
        },

        sortItems() {
            switch (this.sortBy) {
                case 'price-asc':
                    this.filteredItems.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    this.filteredItems.sort((a, b) => b.price - a.price);
                    break;
                case 'name':
                    this.filteredItems.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
                    break;
                default:
                    // 默认排序保持原顺序
                    break;
            }
        },

        resetFilters() {
            this.currentCategory = 'all';
            this.priceRange = [0, 1000000];
            this.currencyFilter = {
                money: true,
                black_money: true
            };
            this.searchQuery = '';
            this.sortBy = 'default';
            this.filterItems();
        },

        getCategoryCount(categoryId) {
            if (categoryId === 'all') {
                return this.allItems.length;
            }
            return this.allItems.filter(item => item.category === categoryId).length;
        },

        getCategoryName(categoryId) {
            const category = this.categories.find(cat => cat.id === categoryId);
            return category ? category.name : categoryId;
        },

        showItemDetail(item) {
            this.selectedItem = item;
            this.showDetailModal = true;
        },

        // ============= 购物车相关 =============
        addToCart(item) {
            const existingItem = this.cart.find(i => i.id === item.id);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                this.cart.push({
                    ...item,
                    quantity: 1
                });
            }

            this.saveCart();
            this.showToast(`已添加 ${item.name} 到购物车`, 'success');

            // 触发购物车徽章动画
            this.triggerCartBadgeAnimation();
        },

        triggerCartBadgeAnimation() {
            // 为购物车徽章添加动画类
            const badge = document.querySelector('.cart-badge');
            if (badge) {
                badge.classList.add('animate');
                setTimeout(() => {
                    badge.classList.remove('animate');
                }, 400);
            }
        },

        removeFromCart(itemId) {
            this.cart = this.cart.filter(item => item.id !== itemId);
            this.saveCart();
        },

        updateQuantity(itemId, change) {
            const item = this.cart.find(i => i.id === itemId);
            if (!item) return;

            item.quantity += change;

            if (item.quantity <= 0) {
                this.removeFromCart(itemId);
            } else {
                this.saveCart();
            }
        },

        saveCart() {
            localStorage.setItem('esx_shop_cart', JSON.stringify(this.cart));
        },

        restoreCart() {
            const saved = localStorage.getItem('esx_shop_cart');
            if (saved) {
                try {
                    this.cart = JSON.parse(saved);
                } catch (e) {
                    // 静默失败
                }
            }
        },

        async checkout() {
            if (!this.currentUser) {
                this.showToast('请先登录', 'danger');
                this.showLoginModal = true;
                return;
            }

            if (this.cart.length === 0) {
                this.showToast('购物车是空的', 'danger');
                return;
            }

            // 检查余额
            if (this.totalMoney > this.currentUser.accounts.money) {
                this.showToast(`现金不足！需要 $${this.formatMoney(this.totalMoney)}`, 'danger');
                return;
            }

            if (this.totalBlackMoney > this.currentUser.accounts.black_money) {
                this.showToast(`黑钱不足！需要 $${this.formatMoney(this.totalBlackMoney)}`, 'danger');
                return;
            }

            try {
                const response = await fetch('/api/shop/purchase', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        identifier: this.currentUser.identifier,
                        items: this.cart.map(item => ({
                            id: item.id,
                            quantity: item.quantity
                        }))
                    })
                });

                const data = await response.json();

                if (data.success) {
                    this.showToast('✅ 购买成功！请查看游戏背包', 'success');

                    // 清空购物车
                    this.cart = [];
                    this.saveCart();
                    this.showCartSidebar = false;

                    // 刷新用户信息
                    setTimeout(() => {
                        this.login();
                    }, 1000);
                } else {
                    this.showToast(data.error || '购买失败', 'danger');
                }
            } catch (error) {
                this.showToast('购买失败，请稍后重试', 'danger');
            }
        },

        // ============= 用户相关 =============
        async login() {
            if (!this.loginIdentifier.trim()) {
                this.showToast('请输入玩家标识符', 'danger');
                return;
            }

            try {
                const response = await fetch(`/api/shop/player/${this.loginIdentifier}`);
                const data = await response.json();

                if (data.success) {
                    this.currentUser = data.player;
                    localStorage.setItem('esx_shop_user', JSON.stringify(this.currentUser));
                    this.showLoginModal = false;
                    this.showToast(`欢迎, ${this.currentUser.name}!`, 'success');
                } else {
                    this.showToast(data.error || '登录失败', 'danger');
                }
            } catch (error) {
                this.showToast('登录失败', 'danger');
            }
        },

        logout() {
            this.currentUser = null;
            localStorage.removeItem('esx_shop_user');
            this.showToast('已退出登录', 'success');
        },

        restoreUser() {
            const saved = localStorage.getItem('esx_shop_user');
            if (saved) {
                try {
                    this.currentUser = JSON.parse(saved);
                } catch (e) {
                    // 静默失败
                }
            }
        },

        // ============= 工具函数 =============
        formatMoney(amount) {
            return amount.toLocaleString('zh-CN');
        },

        showToast(message, type = 'success') {
            const toast = { message, type };
            this.toasts.push(toast);

            setTimeout(() => {
                this.removeToast(0);
            }, 3000);
        },

        removeToast(index) {
            this.toasts.splice(index, 1);
        }
    },

    watch: {
        currentCategory() {
            this.filterItems();
        },

        priceRange: {
            handler() {
                this.filterItems();
            },
            deep: true
        },

        currencyFilter: {
            handler() {
                this.filterItems();
            },
            deep: true
        }
    }
}).mount('#app');
