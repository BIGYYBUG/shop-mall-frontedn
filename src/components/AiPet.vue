<template>
  <!-- ===== 悬浮桌宠 AI 助手 ===== -->
  <div class="ai-pet-root">
    <!-- 打招呼气泡（首次进入，几秒后自动收起） -->
    <transition name="pet-pop">
      <div v-if="showGreet" class="greet-bubble">
        你好呀，我是小 Mall 🤖<br />
        点我就能咨询购物问题～
      </div>
    </transition>

    <!-- 宠物本体：点击展开/收起聊天面板 -->
    <button
      type="button"
      class="pet"
      :class="{ active: open }"
      :aria-label="open ? '收起 AI 助手' : '打开 AI 助手'"
      @click="toggle"
    >
      <!-- 小机器人 SVG -->
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
        <!-- 天线 -->
        <line x1="32" y1="10" x2="32" y2="16" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="32" cy="8" r="3.2" fill="#4f46e5">
          <!-- 信号灯呼吸 -->
          <animate attributeName="opacity" values="1;0.35;1" dur="2s" repeatCount="indefinite" />
        </circle>

        <!-- 头/身体一体的圆壳 -->
        <rect x="10" y="16" width="44" height="36" rx="16" fill="#fff" stroke="#16181d" stroke-width="2.5" />
        <!-- 脸屏 -->
        <rect x="16" y="24" width="32" height="18" rx="9" fill="#eef2ff" />

        <!-- 眼睛（眨眼动画） -->
        <g>
          <circle cx="25.5" cy="33" r="3" fill="#16181d">
            <animate attributeName="ry" values="3;3;0.4;3;3" keyTimes="0;0.42;0.46;0.5;1" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="38.5" cy="33" r="3" fill="#16181d">
            <animate attributeName="ry" values="3;3;0.4;3;3" keyTimes="0;0.42;0.46;0.5;1" dur="4s" repeatCount="indefinite" />
          </circle>
        </g>

        <!-- 嘴 -->
        <path d="M27 39.5c1.5 1.8 3.3 2.6 5 2.6s3.5-.8 5-2.6" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" />

        <!-- 两侧小耳朵 -->
        <rect x="6" y="30" width="4" height="10" rx="2" fill="#d8dce3" />
        <rect x="54" y="30" width="4" height="10" rx="2" fill="#d8dce3" />

        <!-- 底部小脚 -->
        <rect x="20" y="52" width="8" height="5" rx="2.5" fill="#16181d" />
        <rect x="36" y="52" width="8" height="5" rx="2.5" fill="#16181d" />
      </svg>

      <!-- 展开状态下显示关闭 × -->
      <span v-if="open" class="pet-close" aria-hidden="true">×</span>
    </button>

    <!-- 聊天面板 -->
    <transition name="panel-pop">
      <div v-if="open" class="chat-panel">
        <header class="chat-head">
          <div class="chat-head-text">
            <h1 class="chat-title">商城助手</h1>
            <p class="chat-sub">
              大模型导购 · 纯对话
              <span class="tag">暂无数据查询能力</span>
            </p>
          </div>
          <button
            type="button"
            class="ghost-btn"
            :disabled="messages.length === 0 && !error"
            title="开启全新会话（旧会话记录仍保存在后端，本地不再引用）"
            @click="clearChat"
          >
            新对话
          </button>
        </header>

        <div ref="bodyRef" class="chat-body">
          <!-- 空状态 -->
          <div v-if="messages.length === 0" class="empty">
            <p class="empty-title">你好，我是商城助手</p>
            <div class="samples">
              <button
                v-for="s in samples"
                :key="s"
                type="button"
                class="sample"
                @click="send(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <!-- 消息列表 -->
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <div class="bubble">
              <p class="bubble-text">{{ m.content }}</p>
              <!-- token 用量：刻意显示，开发阶段让成本可见 -->
              <p v-if="m.usage" class="bubble-meta">
                {{ m.usage.promptTokens }} + {{ m.usage.completionTokens }} =
                {{ m.usage.totalTokens }} tok · {{ m.usage.costMs }} ms
              </p>
            </div>
          </div>

          <!-- 等待中 -->
          <div v-if="loading" class="msg assistant">
            <div class="bubble">
              <span class="typing"><i></i><i></i><i></i></span>
            </div>
          </div>

          <!-- 错误 -->
          <div v-if="error" class="err">{{ error }}</div>
        </div>

        <footer class="chat-foot">
          <textarea
            v-model="input"
            class="input"
            rows="1"
            placeholder="说点什么…（Enter 发送）"
            :disabled="loading"
            @keydown.enter.exact.prevent="send()"
          ></textarea>
          <button
            type="button"
            class="send-btn"
            :disabled="loading || !input.trim()"
            @click="send()"
          >
            {{ loading ? '…' : '发送' }}
          </button>
        </footer>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { chat, clearConversationId, MAX_MESSAGE_LEN, saveConversationId } from '../api/ai'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const STORAGE_KEY = 'ai_pet_messages'
/* 最多保留的持久化消息条数。聊天记录是"体验数据"不是"业务数据"，
   截断上限防止 localStorage 被长对话无限撑大（5MB 配额）。 */
const MAX_PERSIST = 100

const open = ref(false)
const showGreet = ref(false)
const messages = ref([])
const input = ref('')
const loading = ref(false)
const error = ref('')
const bodyRef = ref(null)

/* /ai/chat 已要求登录（仅校验令牌）。未登录时按钮给出引导而不是发请求吃 401。 */
const isLoggedIn = computed(() => userStore.isLoggedIn)

/**
 * 从 localStorage 恢复聊天记录。
 * 读取包 try/catch：隐私模式 / 配额损坏 / 手动改坏 JSON 都可能抛错，
 * 崩溃不如从空白开始。
 */
const restoreMessages = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const list = JSON.parse(raw)
    if (Array.isArray(list)) {
      messages.value = list.filter(
        (m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant')
      )
    }
  } catch {
    /* 数据坏了就当没有记录 */
  }
}

/**
 * 持久化消息列表（含节流写盘）。
 */
let saveTimer = null
const persistMessages = () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value.slice(-MAX_PERSIST)))
    } catch {
      /* 写入失败（配额满/隐私模式）静默降级：会话内继续可用 */
    }
  }, 300)
}

watch(messages, persistMessages, { deep: true })

/* 登出即弃会话：conversationId 绑定的是「上一个账号」的会话，
   换账号登录后若还带着旧 ID，等于让新账号续写旧账号的对话（串号）。
   后端是 append-only 删不掉历史，本地直接翻篇最干净。 */
watch(isLoggedIn, (now) => {
  if (!now) {
    messages.value = []
    error.value = ''
    input.value = ''
    open.value = false
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略 */
    }
    clearConversationId()
  }
})

onMounted(() => {
  restoreMessages()
  // 有历史记录的用户不需要再看打招呼气泡
  if (messages.value.length === 0) {
    // 进站 1.5 秒后弹出打招呼气泡，8 秒后自动收起
    setTimeout(() => {
      showGreet.value = true
      setTimeout(() => {
        showGreet.value = false
      }, 8000)
    }, 1500)
  }
})

const toggle = () => {
  open.value = !open.value
  if (open.value) {
    showGreet.value = false
    // 展开时滚到历史消息底部，直接看到最近对话
    scrollToBottom()
  }
}

/**
 * 示例问题。第三条是刻意放的「诱导性提问」——
 * 用来验证助手会不会编造订单数据。正常表现是：如实说查不到。
 */
const samples = [
  '你好，你能做什么？',
  '帮我推荐一款 300 元以内的蓝牙耳机',
  '帮我查一下用户 5 的订单'
]

/**
 * 滚动到底部。必须先 await nextTick()：
 * Vue 的 DOM 更新是异步的，直接滚会滚到「上一条消息」的位置。
 */
const scrollToBottom = async () => {
  await nextTick()
  const el = bodyRef.value
  if (el) el.scrollTop = el.scrollHeight
}

const send = async (text) => {
  const content = (text ?? input.value).trim()
  if (!content || loading.value) return

  // 登录校验：/ai/chat 后端只校验令牌，未登录会 401 被拦截器跳登录页。
  // 主动前置拦截，给出引导而不是让面板突然消失。
  if (!isLoggedIn.value) {
    error.value = '登录后才能与助手对话'
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }

  // 长度前置拦截：后端 @Size(max=2000) 会 400，这里先拦省一次请求
  if (content.length > MAX_MESSAGE_LEN) {
    error.value = `消息过长（${content.length}/${MAX_MESSAGE_LEN} 字），请精简后重试`
    return
  }

  error.value = ''
  messages.value.push({ role: 'user', content })
  input.value = ''
  loading.value = true
  scrollToBottom()

  try {
    const data = await chat(content)
    // 多轮会话关键：拿到响应立刻持久化 conversationId，
    // 忘了存的话下一轮就"失忆"（每轮开新会话，还多花钱）
    saveConversationId(data.conversationId)
    messages.value.push({
      role: 'assistant',
      content: data.reply,
      usage: {
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        costMs: data.costMs
      }
    })
  } catch (e) {
    error.value = e.message || '请求失败，请稍后重试'
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

/** 新对话：清消息 + 清会话 ID（后端 append-only，无法删历史，只能本地翻篇） */
const clearChat = () => {
  messages.value = []
  error.value = ''
  input.value = ''
  // 清空即清库：用户意图是抹掉记录，不能只清内存留旧数据
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* 忽略 */
  }
  // 同时丢弃会话 ID —— 不清的话下一次发送仍带着旧会话，模型"记得"已删掉的对话
  clearConversationId()
}
</script>

<style scoped>
.ai-pet-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 200;
  /* 只接受来自自身的点击，不挡页面内容 */
  pointer-events: none;
}

.ai-pet-root > * {
  pointer-events: auto;
}

/* ===== 宠物按钮 ===== */
.pet {
  position: relative;
  width: 64px;
  height: 64px;
  border: 1px solid var(--ink-300);
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  padding: 2px;
  /* 悬浮呼吸 */
  animation: float 3.2s ease-in-out infinite;
  transition: transform 0.2s, border-color 0.2s;
}

.pet:hover {
  border-color: var(--brand-500);
  transform: scale(1.06);
}

.pet.active {
  animation: none;
  transform: scale(1);
  border-color: var(--brand-500);
}

.pet-close {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 30px;
  line-height: 1;
  color: var(--ink-900);
  background: #fff;
  border-radius: 50%;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

/* ===== 打招呼气泡 ===== */
.greet-bubble {
  position: absolute;
  right: 74px;
  bottom: 10px;
  width: 190px;
  padding: 12px 14px;
  border: 1px solid var(--ink-300);
  border-radius: 12px 12px 12px 4px;
  background: #fff;
  box-shadow: var(--shadow-md);
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-900);
}

/* ===== 聊天面板 ===== */
.chat-panel {
  position: absolute;
  right: 0;
  bottom: 76px;
  width: 380px;
  height: min(560px, calc(100vh - 200px));
  display: flex;
  flex-direction: column;
  background: var(--paper);
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 40px rgba(22, 24, 29, 0.16);
  overflow: hidden;
}

/* ---------- 头部 ---------- */
.chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--ink-300);
  background: var(--paper);
  flex-shrink: 0;
}

.chat-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-900);
}

.chat-sub {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ink-500);
}

.tag {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 10px;
}

.ghost-btn {
  flex-shrink: 0;
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--ink-300);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-700);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.ghost-btn:hover:not(:disabled) {
  border-color: var(--ink-900);
  color: var(--ink-900);
}

.ghost-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ---------- 消息区 ---------- */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--canvas);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  margin: auto;
  text-align: center;
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
}

.samples {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  margin-top: 14px;
}

.sample {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--ink-300);
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink-700);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, color 0.2s;
}

.sample:hover {
  border-color: var(--brand-500);
  color: var(--brand-600);
}

.msg {
  display: flex;
}

.msg.user {
  justify-content: flex-end;
}

.msg.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 82%;
  padding: 9px 13px;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.msg.user .bubble {
  background: var(--ink-900);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg.assistant .bubble {
  background: var(--paper);
  color: var(--ink-900);
  border: 1px solid var(--ink-300);
  border-bottom-left-radius: 4px;
}

.bubble-text {
  font-size: 13px;
  line-height: 1.6;
  /* 保留模型回复里的换行 */
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-meta {
  margin-top: 6px;
  font-size: 10px;
  color: var(--ink-500);
  font-variant-numeric: tabular-nums;
}

.msg.user .bubble-meta {
  color: rgba(255, 255, 255, 0.6);
}

/* 打字动画 */
.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 16px;
}

.typing i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink-500);
  animation: blink 1.2s infinite ease-in-out;
}

.typing i:nth-child(2) {
  animation-delay: 0.15s;
}

.typing i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes blink {
  0%,
  60%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* 错误提示 */
.err {
  align-self: center;
  max-width: 100%;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: #fdecec;
  color: var(--danger);
  font-size: 12px;
  text-align: center;
}

/* ---------- 输入区 ---------- */
.chat-foot {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--ink-300);
  background: var(--paper);
  flex-shrink: 0;
}

.input {
  flex: 1;
  min-height: 38px;
  max-height: 100px;
  padding: 9px 12px;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-sm);
  background: var(--canvas);
  color: var(--ink-900);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.input:focus {
  border-color: var(--ink-900);
  background: var(--paper);
}

.input:disabled {
  opacity: 0.6;
}

.send-btn {
  flex-shrink: 0;
  height: 38px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--ink-900);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: var(--brand-600);
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ===== 过渡动画 ===== */
.panel-pop-enter-active,
.panel-pop-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.panel-pop-enter-from,
.panel-pop-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
  transform-origin: bottom right;
}

.pet-pop-enter-active,
.pet-pop-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.pet-pop-enter-from,
.pet-pop-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* ===== 小屏适配 ===== */
@media (max-width: 640px) {
  .ai-pet-root {
    right: 16px;
    bottom: 16px;
  }

  .chat-panel {
    /* 小屏直接占满，宠物按钮隐藏避免遮挡 */
    position: fixed;
    inset: 0;
    width: auto;
    height: auto;
    border-radius: 0;
    z-index: 210;
  }
}
</style>
