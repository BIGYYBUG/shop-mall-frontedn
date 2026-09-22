<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- 左侧品牌区：与 Login.vue 保持同一套视觉语言 -->
      <aside class="brand">
        <div class="brand-badge">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
            <defs>
              <linearGradient id="reg-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#6366f1" />
                <stop offset="1" stop-color="#4338ca" />
              </linearGradient>
            </defs>
            <path d="M5 7h14l-1.2 13.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" fill="url(#reg-g)" />
            <path d="M8.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
            <path d="M12 12.4v4.2M9.9 14.5h4.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <span>Mall 商城</span>
        </div>

        <h1 class="brand-title">创建账号 ✨</h1>
        <p class="brand-slogan">注册即可加购、下单，也能申请成为卖家</p>

        <ul class="brand-points">
          <li v-for="p in brandPoints" :key="p.text">
            <span class="point-icon" v-html="p.icon"></span>
            {{ p.text }}
          </li>
        </ul>

        <svg class="brand-deco" viewBox="0 0 220 200" aria-hidden="true">
          <circle cx="176" cy="42" r="60" fill="#ffffff" opacity=".05" />
          <circle cx="36" cy="168" r="44" fill="#ffffff" opacity=".04" />
          <path d="M150 150l4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#ffffff" opacity=".18" />
        </svg>
      </aside>

      <!-- 右侧表单区 -->
      <section class="form-area">
        <h2 class="form-title">注册新账号</h2>

        <form @submit.prevent="handleSubmit">
          <div class="field">
            <label for="username">用户名 <em>*</em></label>
            <input
              id="username"
              v-model.trim="form.username"
              type="text"
              placeholder="3-64 个字符，登录时使用"
              autocomplete="username"
              @blur="validateField('username')"
            />
            <p v-if="errors.username" class="error-text">{{ errors.username }}</p>
          </div>

          <div class="field">
            <label for="password">密码 <em>*</em></label>
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="6-32 位"
              autocomplete="new-password"
              @blur="validateField('password')"
            />
            <button type="button" class="toggle-pwd" @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
            <p v-if="errors.password" class="error-text">{{ errors.password }}</p>
          </div>

          <div class="field">
            <label for="confirm">确认密码 <em>*</em></label>
            <input
              id="confirm"
              v-model="form.confirm"
              :type="showPassword ? 'text' : 'password'"
              placeholder="再输一次密码"
              autocomplete="new-password"
              @blur="validateField('confirm')"
            />
            <p v-if="errors.confirm" class="error-text">{{ errors.confirm }}</p>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="phone">手机号</label>
              <input
                id="phone"
                v-model.trim="form.phone"
                type="tel"
                placeholder="选填"
                autocomplete="tel"
                @blur="validateField('phone')"
              />
              <p v-if="errors.phone" class="error-text">{{ errors.phone }}</p>
            </div>

            <div class="field">
              <label for="nickname">昵称</label>
              <input
                id="nickname"
                v-model.trim="form.nickname"
                type="text"
                placeholder="选填，不填则用用户名"
                autocomplete="nickname"
              />
            </div>
          </div>

          <p v-if="serverError" class="server-error">{{ serverError }}</p>

          <button class="submit-btn" type="submit" :disabled="loading">
            {{ loading ? '注册中…' : '注 册' }}
          </button>
        </form>

        <p class="foot-tip">
          已有账号？
          <router-link class="link" :to="loginTarget">返回登录</router-link>
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { register } from '../api/user'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const brandPoints = [
  {
    text: '注册即可加入购物车',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 7h14l-1.2 13.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`
  },
  {
    text: '免费申请成为卖家',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 9.5 6 5h12l2 4.5M4 9.5h16V19H4V9.5Zm5.5 0V19m5-9.5V19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`
  },
  {
    text: '密码经不可逆哈希存储',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3 5 5.8v5.4c0 4.4 3 8.2 7 9.8 4-1.6 7-5.4 7-9.8V5.8L12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`
  }
]

const form = reactive({
  username: '',
  password: '',
  confirm: '',
  phone: '',
  nickname: ''
})

const errors = reactive({
  username: '',
  password: '',
  confirm: '',
  phone: ''
})

const loading = ref(false)
const showPassword = ref(false)
const serverError = ref('')

/** 从登录页跳过来时带着 redirect，返回登录时要原样带回去，否则用户会丢失原本的目标页 */
const loginTarget = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/')
    ? { path: '/login', query: { redirect } }
    : { path: '/login' }
})

/**
 * 单字段校验 —— 规则与后端 RegisterDTO 上的注解逐一对应。
 * 前端校验只是为了少一次往返，**后端那份才是唯一有效的**（前端可绕过）。
 */
const validateField = (field) => {
  if (field === 'username') {
    if (!form.username) errors.username = '请输入用户名'
    else if (form.username.length < 3 || form.username.length > 64)
      errors.username = '用户名长度需在 3-64 之间'
    else errors.username = ''
  }

  if (field === 'password') {
    if (!form.password) errors.password = '请输入密码'
    else if (form.password.length < 6 || form.password.length > 32)
      errors.password = '密码长度需在 6-32 之间'
    else errors.password = ''
  }

  if (field === 'confirm') {
    if (!form.confirm) errors.confirm = '请再输一次密码'
    else if (form.confirm !== form.password) errors.confirm = '两次输入的密码不一致'
    else errors.confirm = ''
  }

  if (field === 'phone') {
    // 选填：留空直接放行，填了就必须是合法手机号
    if (!form.phone) errors.phone = ''
    else if (!/^1[3-9]\d{9}$/.test(form.phone)) errors.phone = '手机号格式不正确'
    else errors.phone = ''
  }

  return !errors[field]
}

const handleSubmit = async () => {
  serverError.value = ''
  // 四个字段全都要校验：这里刻意不用 && 短路，否则一次只提示一个错误，
  // 用户得来回提交四遍才知道哪里没填对。
  const valid = ['username', 'password', 'confirm', 'phone']
    .map((field) => validateField(field))
    .every(Boolean)
  if (!valid) return

  loading.value = true
  try {
    // 后端注册接口只返回新用户 id，不发令牌 —— 所以注册成功后要显式登录一次。
    // 这样用户能"注册完直接进去"，少一步重复输入；登录失败也不致命，回登录页即可。
    await register({
      username: form.username,
      password: form.password,
      phone: form.phone || null,
      nickname: form.nickname || null
    })

    try {
      await userStore.login({ username: form.username, password: form.password })
      router.push(resolveRedirect(route.query.redirect))
    } catch {
      router.push({ path: '/login', query: { registered: '1' } })
    }
  } catch (e) {
    serverError.value = e.message || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/**
 * 只允许跳回站内路径。
 * 不校验的话 `?redirect=https://evil.com` 会变成一个开放重定向（钓鱼常用手法）。
 */
const resolveRedirect = (redirect) =>
  typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
</script>

<style scoped>
.auth-page {
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

.auth-card {
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
  padding: 40px 44px;
}

.form-title {
  font-size: 20px;
  font-weight: 500;
  color: #333;
  margin-bottom: 24px;
}

.field {
  position: relative;
  margin-bottom: 16px;
}

.field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
}

.field label em {
  font-style: normal;
  color: #e24b4a;
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

/* 手机号 + 昵称并排，省一屏高度 */
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.server-error {
  margin: 4px 0 14px;
  padding: 8px 12px;
  border-radius: 4px;
  background: #fcebeb;
  color: #a32d2d;
  font-size: 13px;
}

.submit-btn {
  width: 100%;
  height: 44px;
  margin-top: 6px;
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

.link {
  font-size: 13px;
  color: var(--brand-600);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.foot-tip {
  margin-top: 20px;
  font-size: 13px;
  color: #999;
  text-align: center;
}

@media (max-width: 760px) {
  .auth-card {
    flex-direction: column;
  }

  .brand {
    flex: none;
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
