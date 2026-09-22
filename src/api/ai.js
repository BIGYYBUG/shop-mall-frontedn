import request from './request'

/** 本轮会话 ID 的持久化位置（与 AiPet 的消息记录同目录） */
export const CONVERSATION_KEY = 'ai_pet_conversation'

/** 单条消息长度上限，与后端 @Size 校验对齐（超长后端会 400，前端先拦省一次请求） */
export const MAX_MESSAGE_LEN = 2000

/**
 * 读取本地会话 ID。
 *
 * <p>注意返回 undefined 与 '' 的语义差别：
 * undefined = 「首轮，还没开过会话」，请求体里**不能带** conversationId 字段；
 * '' 不会出现（新对话时会直接 removeItem）。</p>
 */
export const getConversationId = () => {
  const v = localStorage.getItem(CONVERSATION_KEY)
  return v || undefined
}

/** 保存会话 ID（拿到响应后调用） */
export const saveConversationId = (id) => {
  if (id) localStorage.setItem(CONVERSATION_KEY, id)
}

/** 新对话：清掉本地会话 ID（后端是 append-only，不提供删除） */
export const clearConversationId = () => {
  localStorage.removeItem(CONVERSATION_KEY)
}

/**
 * 与商城助手对话（多轮会话版）。
 *
 * <p><b>conversationId 协议（务必理解，丢了就是"模型失忆"）：</b></p>
 * <ul>
 *   <li>首轮请求<b>不传</b> conversationId；</li>
 *   <li>响应回传 conversationId，前端存到 localStorage；</li>
 *   <li>之后每一轮<b>原样带回</b>。</li>
 * </ul>
 *
 * <p>不带的后果不是报错，而是每轮开新会话 —— 表现为模型失忆，且悄悄多花钱。</p>
 *
 * <p>⚠️ 这里必须单独覆盖 timeout。request.js 全局 10 秒是给普通接口的；
 * 大模型逐 token 生成，整段回复十秒以上是常态。不覆盖会出现「前端报网络异常、
 * 后端还在生成并计费」的假超时。后端 mall.ai.timeout-seconds 是 60 秒，对齐即可。</p>
 *
 * @param {string} message 本轮用户输入（≤2000 字）
 * @returns {Promise<{conversationId:string, reply:string, promptTokens:number,
 *                    completionTokens:number, totalTokens:number, costMs:number}>}
 */
export const chat = (message) => {
  const conversationId = getConversationId()
  const data = { message }
  // 首轮不传字段（undefined 不会被 axios 序列化），后续原样带回
  if (conversationId) data.conversationId = conversationId
  return request.post('/ai/chat', data, { timeout: 60000 })
}
