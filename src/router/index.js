import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    // 登录页不显示公共头部/底部
    meta: { hideLayout: true }
  },
  {
    // 第三方登录回调页：同样不显示公共布局，避免用户在授权跳转中看到半截页面
    path: '/oauth/callback',
    name: 'OauthCallback',
    component: () => import('../views/OauthCallback.vue'),
    meta: { hideLayout: true }
  },
  {
    // AI 助手已改为全局悬浮桌宠（App.vue 内 AiPet 组件），
    // 旧地址重定向回首页，避免历史书签 404。
    path: '/ai',
    redirect: '/'
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('../views/admin/UserManage.vue'),
    meta: {
      requiresAuth: true,
      // 声明本页需要 ADMIN 角色。
      // 注意：这只是「前端体验层」的拦截，能挡住误点，挡不住恶意请求。
      // 真正的权限判定永远在后端 @RequiresPermission，两者必须同时存在。
      requiresRole: 'ADMIN'
    }
  },
  {
    path: '/admin/roles',
    name: 'AdminRoles',
    component: () => import('../views/admin/RoleManage.vue'),
    meta: { requiresAuth: true, requiresRole: 'ADMIN' }
  },
  {
    path: '/admin/shops',
    name: 'AdminShops',
    component: () => import('../views/admin/ShopManage.vue'),
    meta: { requiresAuth: true, requiresRole: 'ADMIN' }
  },
  {
    path: '/admin/products',
    name: 'AdminProducts',
    component: () => import('../views/admin/ProductManage.vue'),
    meta: { requiresAuth: true, requiresRole: 'ADMIN' }
  },
  {
    // 卖家「我的店铺」。刻意不设 requiresRole：
    // 还没通过审核的人没有 SELLER 角色，但也必须能进来提交入驻申请。
    path: '/seller/shop',
    name: 'SellerShop',
    component: () => import('../views/seller/MyShop.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/seller/products',
    name: 'SellerProducts',
    component: () => import('../views/seller/MyProducts.vue'),
    meta: { requiresAuth: true, requiresRole: 'SELLER' }
  },
  {
    // 前台商品详情：免登录
    path: '/products/:id',
    name: 'ProductDetail',
    component: () => import('../views/ProductDetail.vue')
  },
  {
    // 购物车：必须登录。
    // 浏览商品可以免登录（放行清单内），但购物车属于"我的数据"，
    // 后端 /cart/** 不在放行清单里，无令牌直接 401 —— 这里提前拦一次，
    // 避免用户点了链接才被弹到登录页。
    path: '/cart',
    name: 'Cart',
    component: () => import('../views/Cart.vue'),
    meta: { requiresAuth: true }
  },
  {
    // 兜底：未匹配到的路径回首页
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫：统一处理登录态与角色
router.beforeEach((to) => {
  const userStore = useUserStore()

  // ① 需要登录但没有令牌 → 去登录页，并记住原本想去的地址
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // ② 需要特定角色但当前用户不具备 → 回首页
  if (to.meta.requiresRole && !userStore.hasRole(to.meta.requiresRole)) {
    return { name: 'Home' }
  }
})

export default router
