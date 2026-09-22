<template>
  <div class="login-page">
    <div class="login-card">
      <!-- 左侧品牌区 -->
      <aside class="brand">
        <div class="brand-badge">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
            <defs>
              <linearGradient id="login-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#6366f1" />
                <stop offset="1" stop-color="#4338ca" />
              </linearGradient>
            </defs>
            <path d="M5 7h14l-1.2 13.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" fill="url(#login-g)" />
            <path d="M8.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
            <circle cx="10.2" cy="13" r="1" fill="#fff" />
            <circle cx="13.8" cy="13" r="1" fill="#fff" />
            <path d="M10.2 13c0 1.4.8 2.2 1.8 2.2s1.8-.8 1.8-2.2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <span>Mall 商城</span>
        </div>

        <h1 class="brand-title">欢迎回来 👋</h1>
        <p class="brand-slogan">登录后继续你的品质购物之旅</p>

        <ul class="brand-points">
          <li v-for="p in brandPoints" :key="p.text">
            <span class="point-icon" v-html="p.icon"></span>
            {{ p.text }}
          </li>
        </ul>

        <!-- 装饰性 SVG 圆点纹理 -->
        <svg class="brand-deco" viewBox="0 0 220 200" aria-hidden="true">
          <circle cx="176" cy="42" r="60" fill="#ffffff" opacity=".05" />
          <circle cx="36" cy="168" r="44" fill="#ffffff" opacity=".04" />
          <path d="M150 150l4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#ffffff" opacity=".18" />
        </svg>
      </aside>

      <!-- 右侧表单区 -->
      <section class="form-area">
        <h2 class="form-title">账号登录</h2>

        <form @submit.prevent="handleSubmit">
          <div class="field">
            <label for="username">用户名 / 手机号</label>
            <input
              id="username"
              v-model.trim="form.username"
              type="text"
              placeholder="请输入用户名或手机号"
              autocomplete="username"
              @blur="validateField('username')"
            />
            <p v-if="errors.username" class="error-text">{{ errors.username }}</p>
          </div>

          <div class="field">
            <label for="password">密码</label>
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
              @blur="validateField('password')"
            />
            <button
              type="button"
              class="toggle-pwd"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
            <p v-if="errors.password" class="error-text">{{ errors.password }}</p>
          </div>

          <div class="row-between">
            <label class="remember">
              <input v-model="form.remember" type="checkbox" />
              <span>记住我</span>
            </label>
            <a class="link" href="javascript:void(0)">忘记密码？</a>
          </div>

          <p v-if="serverError" class="server-error">{{ serverError }}</p>

          <button class="submit-btn" type="submit" :disabled="loading">
            {{ loading ? '登录中…' : '登 录' }}
          </button>
        </form>

        <p class="foot-tip">
          还没有账号？
          <router-link class="link" to="/register">立即注册</router-link>
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { listSocialSources, getAuthorizeUrl, createState } from '../api/social'

const router = useRouter()
const userStore = useUserStore()

const brandPoints = [
  {
    text: '正品保障 · 假一赔十',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3 5 5.8v5.4c0 4.4 3 8.2 7 9.8 4-1.6 7-5.4 7-9.8V5.8L12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`
  },
  {
    text: '极速配送 · 211 限时达',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 7h10v9H3V7Zm10 3h4.2l2.8 3.4V16h-7v-6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="18" r="1.8" fill="currentColor"/></svg>`
  },
  {
    text: '无忧退换 · 7 天无理由',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4.5 9.5A8 8 0 0 1 19 8.2M19.5 14.5A8 8 0 0 1 5 15.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 5v4.5h4.5M20 19v-4.5h-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  }
]

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const errors = reactive({
  username: '',
  password: ''
})

const loading = ref(false)
const showPassword = ref(false)
const serverError = ref('')

/** 可用第三方渠道，由后端 /auth/sources 决定（未配置 AppID 时为空数组） */
const socialSources = ref([])

const SOURCE_NAMES = { wechat: '微信登录', qq: 'QQ 登录', alipay: '支付宝登录' }
const sourceName = (source) => SOURCE_NAMES[source] || `${source} 登录`

/**
 * 发起第三方登录：先取授权地址，再整页跳转。
 *
 * 为什么不在这里直接请求用户信息？因为 access_token 只能由后端持有。
 * 前端拿到的 code 是一次性授权码，必须交回后端去换取真正的凭据。
 */
const handleSocialLogin = async (source) => {
  serverError.value = ''
  try {
    const state = createState()
    const url = await getAuthorizeUrl(source, state)
    window.location.href = url
  } catch (e) {
    serverError.value = e.message || '第三方登录暂不可用'
  }
}

onMounted(async () => {
  try {
    socialSources.value = await listSocialSources()
  } catch {
    // 渠道查询失败不应该影响账号密码登录，静默降级即可
    socialSources.value = []
  }
})

/**
 * 单字段校验
 */
const validateField = (field) => {
  if (field === 'username') {
    if (!form.username) {
      errors.username = '请输入用户名或手机号'
    } else if (form.username.length < 3) {
      errors.username = '用户名至少 3 个字符'
    } else {
      errors.username = ''
    }
  }

  if (field === 'password') {
    if (!form.password) {
      errors.password = '请输入密码'
    } else if (form.password.length < 6) {
      errors.password = '密码至少 6 位'
    } else {
      errors.password = ''
    }
  }
  return !errors[field]
}

/**
 * 提交登录
 */
const handleSubmit = async () => {
  serverError.value = ''
  const okUser = validateField('username')
  const okPwd = validateField('password')
  if (!okUser || !okPwd) return

  loading.value = true
  try {
    await userStore.login({
      username: form.username,
      password: form.password
    })
    router.push('/')
  } catch (e) {
    serverError.value = e.message || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(700px 380px at 12% 0%, #eef0f6 0%, transparent 55%),
    radial-gradient(600px 380px at 100% 100%, #e9ebf3 0%, transparent 55%),
    var(--canvas);
}

.login-card {
  position: relative;
  display: flex;
  width: 880px;
  max-width: 100%;
  min-height: 480px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #fff;
  box-shadow: 0 20px 60px rgba(31, 35, 41, 0.14);
}

/* 左侧品牌区 */
.brand {
  position: relative;
  flex: 0 0 340px;
  padding: 44px 36px;
  background:
    radial-gradient(420px 260px at -10% 110%, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
    #1b1e28;
  color: #fff;
  overflow: hidden;
}

.brand-badge {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
}

.brand-title {
  position: relative;
  z-index: 1;
  margin-top: 40px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
}

.brand-slogan {
  position: relative;
  z-index: 1;
  margin-top: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.78);
}

.brand-points {
  position: relative;
  z-index: 1;
  margin-top: 44px;
}

.brand-points li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 13px;
  color: #fff;
}

.point-icon {
  display: grid;
  place-items: center;
  color: #c7d2fe;
}

.brand-deco {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 右侧表单区 */
.form-area {
  flex: 1;
  padding: 48px 44px;
}

.form-title {
  font-size: 20px;
  font-weight: 500;
  color: #333;
  margin-bottom: 28px;
}

.field {
  position: relative;
  margin-bottom: 20px;
}

.field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
}

.field input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.field input:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
}

.toggle-pwd {
  position: absolute;
  right: 10px;
  top: 31px;
  border: none;
  background: none;
  font-size: 12px;
  color: #999;
  cursor: pointer;
}

.error-text {
  margin-top: 6px;
  font-size: 12px;
  color: #e24b4a;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.link {
  font-size: 13px;
  color: var(--brand-600);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.server-error {
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: 4px;
  background: #fcebeb;
  color: #a32d2d;
  font-size: 13px;
}

.submit-btn {
  width: 100%;
  height: 44px;
  border: 1px solid var(--ink-900);
  border-radius: 999px;
  background: var(--ink-900);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 4px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: var(--brand-600);
  border-color: var(--brand-600);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  background: #c3c7d1;
  border-color: #c3c7d1;
  cursor: not-allowed;
}

/* 第三方登录 */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 14px;
  font-size: 12px;
  color: #b0b4bd;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #eceef1;
}

.social-btn {
  width: 100%;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #e2e5ea;
  border-radius: 999px;
  background: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.social-btn + .social-btn {
  margin-top: 10px;
}

.social-btn:hover {
  border-color: #1aad19;
  background: #f7fdf7;
  transform: translateY(-1px);
}

.foot-tip {
  margin-top: 24px;
  font-size: 13px;
  color: #999;
  text-align: center;
}
</style>
