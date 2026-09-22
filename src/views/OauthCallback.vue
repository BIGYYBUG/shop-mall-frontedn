<template>
  <div class="callback-page">
    <div class="callback-card">
      <!-- 状态图标：加载 / 成功 / 失败 三态 -->
      <div class="icon" :class="status">
        <svg v-if="status === 'loading'" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"
                  stroke-dasharray="42" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate"
                              from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>

        <svg v-else-if="status === 'success'" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2" />
          <path d="m8 12.4 2.6 2.6L16 9.6" fill="none" stroke="currentColor" stroke-width="2.4"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>

        <svg v-else viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2" />
          <path d="M12 7.6v5.2M12 16.2v.2" fill="none" stroke="currentColor" stroke-width="2.4"
                stroke-linecap="round" />
        </svg>
      </div>

      <h1 class="title">{{ title }}</h1>
      <p class="desc">{{ message }}</p>

      <div class="actions">
        <button v-if="status === 'error'" class="btn-primary" @click="backToLogin">
          返回登录
        </button>
        <span v-else-if="status === 'success'" class="hint">正在跳转…</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { verifyState } from '../api/social'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const status = ref('loading')
const message = ref('正在用微信授权信息完成登录，请稍候…')

const title = computed(() => {
  if (status.value === 'success') return '登录成功'
  if (status.value === 'error') return '登录失败'
  return '正在登录'
})

const backToLogin = () => router.replace('/login')

/**
 * 微信授权回调页。
 *
 * 微信完成授权后会跳到 mall.wechat.redirect-uri 配置的地址，
 * 并在 query 上带两个参数：code（一次性授权码）和 state（发起时传的随机串）。
 *
 * 本页只做三件事：
 *   1. 校验 state，确认是用户自己发起的授权（防 CSRF）
 *   2. 把 code 交给后端，换回本系统的 JWT
 *   3. 跳回首页
 */
onMounted(async () => {
  const { code, state } = route.query

  if (!code) {
    status.value = 'error'
    message.value = '未取到授权码，可能是用户取消了授权，或回调地址配置有误。'
    return
  }

  // state 校验失败必须终止 —— 否则攻击者可以伪造一个 code 诱导用户登录到攻击者的账号
  if (!verifyState(state)) {
    status.value = 'error'
    message.value = 'state 校验失败，本次授权可能不是由你发起，已中止登录。'
    return
  }

  try {
    await userStore.socialLogin('wechat', code, state)
    status.value = 'success'
    message.value = '已获取登录凭证，即将进入商城首页。'
    setTimeout(() => router.replace('/'), 700)
  } catch (e) {
    status.value = 'error'
    // code 只能用一次且 5 分钟过期，重复提交会报「授权码已被使用」，这是预期行为
    message.value = e.message || '第三方登录失败，请重新扫码。'
  }
})
</script>

<style scoped>
.callback-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(700px 380px at 12% 0%, #eef0f6 0%, transparent 55%),
    radial-gradient(600px 380px at 100% 100%, #e9ebf3 0%, transparent 55%),
    var(--canvas);
}

.callback-card {
  width: 420px;
  max-width: 100%;
  padding: 40px 32px 32px;
  border-radius: var(--radius-lg);
  background: #fff;
  text-align: center;
  box-shadow: 0 20px 60px rgba(31, 35, 41, 0.14);
}

.icon {
  display: grid;
  place-items: center;
  margin: 0 auto 20px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

.icon.loading {
  background: var(--brand-50);
  color: var(--brand-600);
}

.icon.success {
  background: #e9f7ee;
  color: var(--success);
}

.icon.error {
  background: #fdecec;
  color: var(--danger);
}

.title {
  font-size: 19px;
  font-weight: 600;
}

.desc {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink-500);
}

.actions {
  margin-top: 24px;
}

.btn-primary {
  height: 40px;
  padding: 0 28px;
  border: 1px solid var(--ink-900);
  border-radius: 999px;
  background: var(--ink-900);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.btn-primary:hover {
  background: var(--brand-600);
  border-color: var(--brand-600);
}

.hint {
  font-size: 13px;
  color: var(--ink-500);
}
</style>
