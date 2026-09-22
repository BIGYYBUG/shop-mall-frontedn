<template>
  <div id="app">
    <!-- 登录页隐藏公共头部/底部 -->
    <template v-if="!route.meta.hideLayout">
      <header class="app-header">
        <div class="container header-inner">
          <router-link to="/" class="logo">
            <!-- 品牌图标：购物袋 -->
            <svg class="logo-mark" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path
                d="M5 7h14l-1.2 13.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                d="M8.5 9.5V6.5a3.5 3.5 0 0 1 7 0v3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
            <span class="logo-text">Mall</span>
          </router-link>

          <!-- 搜索框：回车 / 点按钮跳首页并带上关键词（首页消费 query.keyword 发起真实搜索） -->
          <form
            class="search-bar"
            role="search"
            @submit.prevent="handleSearch"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <input
              v-model="searchKeyword"
              type="search"
              placeholder="搜索商品，例如：手机、跑鞋…"
            />
            <button type="submit" class="search-btn">搜索</button>
          </form>

          <nav class="nav">
            <router-link to="/">首页</router-link>
            <!-- 卖家中心下拉：登录即可见（店铺入口未入驻也能进去申请） -->
            <el-dropdown v-if="userStore.isLoggedIn" trigger="click">
              <span class="nav-admin">卖家中心 ⌄</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="router.push('/seller/shop')">我的店铺</el-dropdown-item>
                  <el-dropdown-item
                    v-if="userStore.hasRole('SELLER')"
                    @click="router.push('/seller/products')"
                  >
                    我的商品
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <!-- 管理后台下拉：仅 ADMIN 可见（体验层显隐，真拦截在后端） -->
            <el-dropdown v-if="userStore.hasRole('ADMIN')" trigger="click">
              <span class="nav-admin">后台 ⌄</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="router.push('/admin/users')">用户管理</el-dropdown-item>
                  <el-dropdown-item @click="router.push('/admin/roles')">角色管理</el-dropdown-item>
                  <el-dropdown-item @click="router.push('/admin/shops')">店铺审核</el-dropdown-item>
                  <el-dropdown-item @click="router.push('/admin/products')">商品管理</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <template v-if="userStore.isLoggedIn">
              <span class="welcome">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="12" cy="8.2" r="3.6" fill="currentColor" opacity=".9" />
                  <path d="M4.8 19.4a7.2 7.2 0 0 1 14.4 0" fill="currentColor" opacity=".9" />
                </svg>
                {{ userStore.userInfo?.nickname || '已登录' }}
              </span>
              <a href="javascript:void(0)" @click="handleLogout">退出</a>
            </template>
            <router-link v-else to="/login" class="nav-login">登录</router-link>
          </nav>
        </div>
      </header>

      <main class="app-main">
        <router-view />
      </main>

      <footer class="app-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <p class="footer-title">Mall 商城</p>
            <p class="footer-desc">甄选好物 · 极速配送 · 安心购</p>
          </div>
          <ul class="footer-links">
            <li><a href="javascript:void(0)">关于我们</a></li>
            <li><a href="javascript:void(0)">帮助中心</a></li>
            <li><a href="javascript:void(0)">配送说明</a></li>
            <li><a href="javascript:void(0)">售后服务</a></li>
          </ul>
        </div>
        <p class="footer-copy">Mall © 2026 · 学习项目演示</p>
      </footer>

      <!-- 悬浮桌宠 AI 助手：全局可见（登录/回调等全屏页除外） -->
      <AiPet />
    </template>

    <!-- 登录页直接渲染 -->
    <router-view v-else />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import AiPet from './components/AiPet.vue'

const route = useRoute()
// 注意：useRoute 拿的是「当前路由信息」，useRouter 才是「跳转能力」，两者不能混用。
// logout 里要主动跳转，所以这里必须声明 router。
const router = useRouter()
const userStore = useUserStore()

/* ---------- 全局搜索 ---------- */
const searchKeyword = ref('')

/**
 * 搜索流转：跳到首页，关键词放 query（不放在 path 里，避免编码问题）。
 * 首页 watch route.query.keyword，变化即发起真实搜索。
 * 已在首页时 router.push 相同 query 不会触发重复导航报错，query 变化照常生效。
 */
const handleSearch = () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return
  router.push({ path: '/', query: { ...route.query, keyword } })
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.container {
  width: var(--container);
  max-width: 100%;
  margin: 0 auto;
  padding: 0 32px;
}

/* ---------- 头部 ---------- */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-h);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ink-300);
  color: var(--ink-900);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 100%;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  color: var(--ink-900);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
}

/* 搜索条 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 480px;
  height: 40px;
  padding: 0 5px 0 14px;
  border: 1px solid var(--ink-300);
  border-radius: 999px;
  color: var(--ink-500);
  background: var(--canvas);
  transition: border-color 0.2s, background 0.2s;
}

.search-bar:focus-within {
  border-color: var(--ink-900);
  background: #fff;
}

.search-bar input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--ink-900);
  background: transparent;
}

.search-bar input::placeholder {
  color: var(--ink-500);
}

.search-btn {
  height: 32px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: var(--ink-900);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-btn:hover {
  background: var(--brand-600);
}

/* 导航 */
.nav {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-left: auto;
  flex-shrink: 0;
}

.nav a {
  font-size: 14px;
  color: var(--ink-700);
  transition: color 0.2s;
}

.nav a:hover {
  color: var(--ink-900);
}

.nav a.router-link-active {
  color: var(--ink-900);
  font-weight: 600;
}

.nav-login {
  height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 20px;
  border: 1px solid var(--ink-900);
  border-radius: 999px;
  color: var(--ink-900) !important;
  font-size: 13px;
  transition: background 0.2s, color 0.2s;
}

/* 后台下拉触发器 */
.nav-admin {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  color: var(--ink-700);
  cursor: pointer;
  outline: none;
}

.nav-admin:hover {
  color: var(--ink-900);
}

.nav-login:hover {
  background: var(--ink-900);
  color: #fff !important;
}

.welcome {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--ink-700);
}

/* ---------- 主体 ---------- */
.app-main {
  flex: 1;
  padding: 32px 0 56px;
}

/* ---------- 底部 ---------- */
.app-footer {
  background: #fff;
  border-top: 1px solid var(--ink-300);
  padding: 40px 0 20px;
}

.footer-grid {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.footer-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--ink-900);
}

.footer-desc {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ink-500);
}

.footer-links {
  display: flex;
  gap: 32px;
}

.footer-links a {
  font-size: 13px;
  color: var(--ink-500);
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--ink-900);
}

.footer-copy {
  margin-top: 32px;
  text-align: center;
  font-size: 12px;
  color: var(--ink-500);
  border-top: 1px solid #f0f1f3;
  padding-top: 18px;
}
</style>
